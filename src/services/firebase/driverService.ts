import { db } from './config';
import { doc, getDoc, getDocs, collection, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { FIRESTORE_COLLECTIONS } from './constants';
import { DriverProfile, AuthAccount } from '../../types/models';
import { AccountStatus, AccountType } from '../../types/enums';
import { NearpayService } from '../nearpay/nearpayService';
import { checkEmailExists, checkMobileExists, formatEmail, formatMobile } from './utils';

// Helper function to generate a random 6-digit number string
const generateTrsmCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export class DriverService {
  /**
   * استرجاع مستخدم نهائي (سائق) محدد بواسطة المعرف
   */
  static async getDriverById(id: string): Promise<DriverProfile | null> {
    try {
      const userDocRef = doc(db, FIRESTORE_COLLECTIONS.END_USERS, id);
      const userSnapshot = await getDoc(userDocRef);
      
      if (!userSnapshot.exists()) {
        return null;
      }
      
      const userData = userSnapshot.data();
      return {
        id: userSnapshot.id,
        terminal_id: userData.terminal_id,
        tid: userData.tid,
        merchant_id: userData.merchant_id,
        name: userData.name,
        email: userData.email,
        city: userData.city,
        mobile: userData.mobile,
        type: AccountType.Driver,
        status: userData.status as AccountStatus,
        country_code: userData.country_code,
        created_at: userData.created_at,
      } as DriverProfile;
    } catch (error) {
      console.error('Error fetching end user details:', error);
      throw error;
    }
  }

  /**
   * استرجاع قائمة السائقين
   */
  static async getDrivers(): Promise<DriverProfile[]> {
    try {
      const driversRef = collection(db, FIRESTORE_COLLECTIONS.END_USERS);
      const driversSnapshot = await getDocs(driversRef);
      const drivers: DriverProfile[] = [];

      driversSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        drivers.push({
          id: data.id,
          terminal_id: data.terminal_id,
          tid: data.tid,
          merchant_id: data.merchant_id,
          name: data.name,
          email: data.email,
          city: data.city,
          mobile: data.mobile,
          type: AccountType.Driver,
          status: data.status as AccountStatus,
          country_code: data.country_code,
          created_at: data.created_at,
        } as DriverProfile);
      });

      return drivers;
    } catch (error) {
      console.error('Error fetching drivers:', error);
      throw error;
    }
  }

  /**
   * إضافة سائق جديد
   */
  static async addDriver(driverData: Omit<DriverProfile, 'id' | 'created_at'> & { password: string }): Promise<DriverProfile> {
    try {
      // معالجة البريد الإلكتروني ورقم الهاتف
      const formattedEmail = formatEmail(driverData.email);
      const formattedMobile = formatMobile(driverData.mobile);
      
      // 1. Check if email or mobile already exists in Firebase
      const emailExists = await checkEmailExists(formattedEmail);
      if (emailExists) {
        throw new Error('هذا البريد الإلكتروني مسجل مسبقًا.');
      }
      const mobileExists = await checkMobileExists(formattedMobile, driverData.country_code);
      if (mobileExists) {
        throw new Error('رقم الجوال هذا مسجل مسبقًا مع نفس رمز الدولة.');
      }

      // Prepare Nearpay phone format: +countryCodePhone (without leading zero)
      const nearpayMobile = `+${driverData.country_code}${formattedMobile}`;

      // 2. Get Access Token from Nearpay
      const accessToken = await NearpayService.getAccessToken();

      // 3. Create Nearpay User
      const nearpayUser = await NearpayService.createNearpayUser({
        name: driverData.name,
        email: formattedEmail,
        mobile: nearpayMobile,
        merchant_id: driverData.merchant_id,
      }, accessToken);

      const driverNearpayId = nearpayUser.id; // This will be the driver's ID in Firebase as well

      // 4. Create Terminal in Nearpay
      const trsmCode = generateTrsmCode();
      const terminal = await NearpayService.createTerminal({
        name: driverData.name, // Driver's name for the terminal
        merchant_id: driverData.merchant_id,
        trsm_code: trsmCode,
      });
      const terminalId = terminal.id;
      const tid = terminal.tid;

      // 5. Assign Terminal to User in Nearpay
      await NearpayService.assignTerminalToUser(terminalId, {
        name: driverData.name,
        email: formattedEmail,
        mobile: nearpayMobile,
      });

      // 6. Hash password (MD5)
      const hashedPassword = CryptoJS.MD5(driverData.password).toString();
      const creationTimestamp = new Date().toISOString();

      // 7. Add to 'accounts' collection in Firebase
      const authAccountRef = doc(db, FIRESTORE_COLLECTIONS.ACCOUNTS, driverNearpayId);
      const authAccountData: AuthAccount = {
        id: driverNearpayId,
        email: formattedEmail,
        mobile: formattedMobile,
        country_code: driverData.country_code,
        password_hash: hashedPassword, // Firestore field is password_hash
        type: AccountType.Driver,
        status: driverData.status, // Or default to AccountStatus.Active if not provided
      };
      await setDoc(authAccountRef, authAccountData);

      // 8. Add to 'end_users' collection in Firebase
      const driverProfileRef = doc(db, FIRESTORE_COLLECTIONS.END_USERS, driverNearpayId);
      const driverProfileData = {
        id: driverNearpayId,
        name: driverData.name,
        email: formattedEmail,
        mobile: formattedMobile,
        country_code: driverData.country_code,
        city: driverData.city,
        status: driverData.status,
        merchant_id: driverData.merchant_id,
        terminal_id: terminalId,
        tid: tid,
        created_at: creationTimestamp,
      };
      await setDoc(driverProfileRef, driverProfileData);
      
      // عند الإرجاع، أضف type برمجياً
      return {
        ...driverProfileData,
        type: AccountType.Driver,
      } as DriverProfile;

    } catch (error) {
      console.error('Error adding driver:', error);
      // Rethrow the error to be caught by the form hook
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('فشل في إضافة السائق. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * تحديث بيانات سائق
   */
  static async updateDriver(id: string, driverData: Partial<Omit<DriverProfile, 'id' | 'created_at' | 'type'> >): Promise<DriverProfile> {
    try {
      // معالجة البريد الإلكتروني ورقم الهاتف إذا تم توفيرهما
      if (driverData.email) {
        driverData.email = formatEmail(driverData.email);
      }
      
      if (driverData.mobile) {
        driverData.mobile = formatMobile(driverData.mobile);
      }
      
      const driverRef = doc(db, FIRESTORE_COLLECTIONS.END_USERS, id);
      
      const updateData: Partial<DriverProfile> = { ...driverData };
      // Ensure `updated_at` is part of DriverProfile or handle it appropriately
      // (updateData as any).updated_at = new Date().toISOString(); 

      await updateDoc(driverRef, updateData);
      
      // Also update relevant fields in the 'accounts' collection if necessary
      const accountUpdateData: Partial<AuthAccount> = {};
      if (driverData.email) accountUpdateData.email = driverData.email;
      if (driverData.mobile) accountUpdateData.mobile = driverData.mobile;
      if (driverData.country_code) accountUpdateData.country_code = driverData.country_code;
      if (driverData.status) accountUpdateData.status = driverData.status;

      if (Object.keys(accountUpdateData).length > 0) {
        // (accountUpdateData as any).updated_at = new Date().toISOString();
        const accountRef = doc(db, FIRESTORE_COLLECTIONS.ACCOUNTS, id);
        await updateDoc(accountRef, accountUpdateData);
      }
      
      const updatedDriver = await this.getDriverById(id);
      if (!updatedDriver) {
        throw new Error('لم يتم العثور على السائق بعد التحديث');
      }
      
      return updatedDriver;
    } catch (error) {
      console.error('Error updating driver:', error);
      throw error;
    }
  }

  /**
   * حذف سائق
   */
  static async deleteDriver(id: string): Promise<void> {
    try {
      const driver = await this.getDriverById(id);
      
      if (driver && driver.terminal_id) {
        // Attempt to unassign and disconnect terminal, ignore errors if they occur
        try {
          await NearpayService.unassignTerminal(driver.terminal_id);
        } catch (unassignError) {
          console.warn(`Could not unassign terminal ${driver.terminal_id} for driver ${id}:`, unassignError);
        }
        try {
          await NearpayService.disconnectTerminal(driver.terminal_id);
        } catch (disconnectError) {
          console.warn(`Could not disconnect terminal ${driver.terminal_id} for driver ${id}:`, disconnectError);
        }
      }
      
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.END_USERS, id));
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.ACCOUNTS, id));
      
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw error;
    }
  }
} 
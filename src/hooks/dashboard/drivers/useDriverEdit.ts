import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { AccountStatus } from '../../../types/enums';
import { DriverService } from '../../../services/firebase/driverService';
import { PasswordService } from '../../../services/firebase/authService';
import { validateEmail, validateName, validateCity, validatePhoneNumber, validatePassword, validatePasswordConfirmation } from '../../../utils/validation';
import { checkEmailExists, checkMobileExists } from '@/services/firebase/utils';

interface DriverFormData {
  name: string;
  email: string;
  mobile: string;
  country_code: number;
  city: string;
  status: AccountStatus;
  password: string;
  confirmPassword: string;
}

interface OriginalData {
  email: string;
  mobile: string;
  country_code: number;
  name: string;
  city: string;
  status: AccountStatus;
}

export interface ValidationErrors {
  name: string | null;
  email: string | null;
  mobile: string | null;
  city: string | null;
  password: string | null;
  confirmPassword: string | null;
}

export const useDriverEdit = (driverId: string | string[] | undefined) => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);

  // بيانات نموذج تعديل السائق
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    email: '',
    mobile: '',
    country_code: 966,
    city: '',
    status: AccountStatus.Active,
    password: '',
    confirmPassword: '',
  });
  
  // تخزين البيانات الأصلية للمقارنة والاستعادة
  const [originalData, setOriginalData] = useState<OriginalData>({
    email: '',
    mobile: '',
    country_code: 966,
    name: '',
    city: '',
    status: AccountStatus.Active,
  });

  // إضافة حالة لأخطاء التحقق
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    name: null,
    email: null,
    mobile: null, 
    city: null,
    password: null,
    confirmPassword: null
  });

  // استرجاع بيانات السائق
  useEffect(() => {
    const fetchDriver = async () => {
      if (!driverId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // استخدام خدمة DriverService بدلاً من الاتصال المباشر بفايربيس
        const driverData = await DriverService.getDriverById(driverId as string);
        
        if (!driverData) {
          setError('السائق غير موجود');
          setLoading(false);
          return;
        }
        
        const driverFormData = {
          name: driverData.name || '',
          email: driverData.email || '',
          mobile: driverData.mobile || '',
          country_code: driverData.country_code || 966,
          city: driverData.city || '',
          status: driverData.status || AccountStatus.Active,
          password: '',
          confirmPassword: '',
        };
        
        setFormData(driverFormData);
        
        // تخزين البيانات الأصلية للمقارنة والاستعادة
        setOriginalData({
          email: driverData.email || '',
          mobile: driverData.mobile || '',
          country_code: driverData.country_code || 966,
          name: driverData.name || '',
          city: driverData.city || '',
          status: driverData.status || AccountStatus.Active,
        });
      } catch (err) {
        console.error('Error fetching driver details:', err);
        setError('حدث خطأ في جلب بيانات السائق');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDriver();
  }, [driverId]);

  // تنفيذ التحقق من جميع الحقول باستخدام useCallback لتجنب إعادة إنشاء الدالة
  const validateFields = useCallback(() => {
    const newValidationErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      mobile: validatePhoneNumber(formData.mobile || '', formData.country_code?.toString() || ''),
      city: validateCity(formData.city),
      password: showPasswordSection ? validatePassword(formData.password || '') : null,
      confirmPassword: showPasswordSection ? validatePasswordConfirmation(formData.password || '', formData.confirmPassword || '') : null
    };
    
    setValidationErrors(newValidationErrors);
    
    // التحقق من عدم وجود أخطاء
    return !Object.values(newValidationErrors).some(error => error !== null);
  }, [formData, showPasswordSection]);

  // التحقق من الحقول عند تغييرها
  useEffect(() => {
    validateFields();
  }, [validateFields]);

  // التعامل مع تغيير قيم الحقول
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // مسح أي رسائل خطأ سابقة للحقل المتغير
    if (name === 'email' || name === 'mobile') {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // التحقق من صحة البيانات
  const validateForm = () => {
    // استخدام وظائف التحقق المحسنة
    const isValid = validateFields();
    
    if (!isValid) {
      // جمع رسائل الخطأ في رسالة واحدة للعرض في الواجهة
      const errorMessages = Object.values(validationErrors)
        .filter(err => err !== null)
        .join(' ');
      
      setError(errorMessages || 'يرجى التحقق من صحة البيانات');
      return false;
    }

    return true;
  };
  
  // التحقق من وجود تكرار للبريد الإلكتروني أو رقم الجوال
  const checkDuplicates = async () => {
    try {
      let hasError = false;
      // مسح أي أخطاء سابقة
      setValidationErrors(prev => ({
        ...prev,
        email: null,
        mobile: null
      }));
      
      // التحقق فقط إذا تم تغيير البيانات
      if (formData.email !== originalData.email) {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          // تخزين رسالة الخطأ في validationErrors بدلاً من الخطأ العام
          setValidationErrors(prev => ({
            ...prev,
            email: 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر.'
          }));
          hasError = true;
        }
      }
      
      if (formData.mobile !== originalData.mobile || Number(formData.country_code) !== originalData.country_code) {
        const mobileExists = await checkMobileExists(
          formData.mobile, 
          Number(formData.country_code)
        );
        if (mobileExists) {
          // تخزين رسالة الخطأ في validationErrors بدلاً من الخطأ العام
          setValidationErrors(prev => ({
            ...prev,
            mobile: 'رقم الجوال مستخدم بالفعل. يرجى استخدام رقم آخر.'
          }));
          hasError = true;
        }
      }
      
      return !hasError;
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setError('حدث خطأ أثناء التحقق من البيانات. يرجى المحاولة مرة أخرى.');
      return false;
    }
  };

  // إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة البيانات
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!driverId) {
        throw new Error('معرف السائق غير موجود');
      }
      
      // التحقق من وجود تكرار للبريد الإلكتروني أو رقم الجوال
      const noDuplicates = await checkDuplicates();
      if (!noDuplicates) {
        setSaving(false);
        return;
      }
      
      // استخدام خدمة DriverService لتحديث بيانات السائق
      await DriverService.updateDriver(driverId as string, {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        country_code: Number(formData.country_code),
        city: formData.city,
        status: formData.status,
      });
      
      // تحديث كلمة المرور إذا تم تغييرها
      if (showPasswordSection && formData.password) {
        await PasswordService.updatePassword(driverId as string, formData.password);
      }
      
      setSuccess('تم تحديث بيانات السائق بنجاح!');
      
      // تحديث البيانات الأصلية
      setOriginalData({
        email: formData.email,
        mobile: formData.mobile,
        country_code: Number(formData.country_code),
        name: formData.name,
        city: formData.city,
        status: formData.status,
      });
      
      // إعادة تعيين حقول كلمة المرور
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
      
      // إخفاء قسم تغيير كلمة المرور
      setShowPasswordSection(false);
      
      // التوجيه إلى صفحة تفاصيل السائق بعد 2 ثانية
      setTimeout(() => {
        router.push(`/dashboard/drivers/${driverId}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error updating driver:', err);
      setError('حدث خطأ أثناء تحديث بيانات السائق. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  // إعادة تعيين النموذج
  const handleReset = () => {
    // استخدام البيانات الأصلية المخزنة بدلاً من إعادة التحميل
    setFormData({
      name: originalData.name,
      email: originalData.email,
      mobile: originalData.mobile,
      country_code: originalData.country_code,
      city: originalData.city,
      status: originalData.status,
      password: '',
      confirmPassword: '',
    });
    
    // إعادة تعيين رسائل الخطأ والنجاح
    setError(null);
    setSuccess(null);
    setValidationErrors({
      name: null,
      email: null,
      mobile: null, 
      city: null,
      password: null,
      confirmPassword: null
    });
    
    // إغلاق قسم كلمة المرور
    setShowPasswordSection(false);
  };

  // تبديل حالة عرض قسم تغيير كلمة المرور
  const togglePasswordSection = () => {
    setShowPasswordSection(prev => !prev);
    // مسح قيم كلمة المرور عند إغلاق القسم
    if (showPasswordSection) {
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
      
      // مسح أخطاء كلمة المرور عند إغلاق القسم
      setValidationErrors(prev => ({
        ...prev,
        password: null,
        confirmPassword: null
      }));
    }
  };

  return {
    loading,
    saving,
    error,
    success,
    formData,
    showPasswordSection,
    validationErrors,
    handleChange,
    handleSubmit,
    handleReset,
    togglePasswordSection,
    validateFields
  };
}; 
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DriverProfile } from '../../../types/models';
import { DriverService } from '../../../services/firebase/driverService';

// نوع لحالة حوار التأكيد
export interface ConfirmDialogState {
  isOpen: boolean;
  driverId: string;
  driverName: string;
}

// نوع للقيم المرجعة من الهوك
export interface DriversPageLogic {
  drivers: DriverProfile[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  confirmDialog: ConfirmDialogState;
  fetchDrivers: () => Promise<void>;
  handleShowDeleteConfirm: (id: string, name: string) => void;
  handleCancelDelete: () => void;
  handleConfirmDelete: () => Promise<void>;
  handleNavigateToAddDriver: () => void;
  handleNavigateToViewDriver: (driverId: string) => void;
  handleNavigateToEditDriver: (driverId: string) => void;
  clearError: () => void;
  clearSuccess: () => void;
}

/**
 * @description منطق مخصص لإدارة صفحة السائقين.
 * يوفر هذا الهوك الحالات والدوال اللازمة للتعامل مع بيانات السائقين،
 * بما في ذلك الجلب، الحذف، وعرض رسائل الحالة والتأكيدات.
 */
export const useDriversPageLogic = (): DriversPageLogic => {
  const router = useRouter();
  
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // حالة حوار التأكيد
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    driverId: '',
    driverName: '',
  });

  // استرجاع قائمة السائقين
  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const drivers = await DriverService.getDrivers();
      setDrivers(drivers);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError('حدث خطأ أثناء جلب بيانات السائقين.');
    } finally {
      setLoading(false);
    }
  }, []);

  // تحميل أول مجموعة من البيانات
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);
  
  // عرض حوار تأكيد الحذف
  const handleShowDeleteConfirm = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      driverId: id,
      driverName: name,
    });
  };

  // إلغاء حوار التأكيد
  const handleCancelDelete = () => {
    setConfirmDialog({
      isOpen: false,
      driverId: '',
      driverName: '',
    });
  };

  // حذف سائق
  const handleConfirmDelete = async () => {
    const { driverId } = confirmDialog;
    
    if (!driverId) return;
    
    try {
      await DriverService.deleteDriver(driverId);
      setDrivers(prevDrivers => prevDrivers.filter(driver => driver.id !== driverId));
      setSuccessMessage('تم حذف السائق بنجاح.');
      handleCancelDelete(); // لإغلاق الحوار وتفريغ البيانات
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error deleting driver:', err);
      setError('حدث خطأ أثناء حذف السائق.');
      handleCancelDelete(); // لإغلاق الحوار وتفريغ البيانات في حالة الخطأ أيضًا
    }
  };

  // التوجيه لصفحة إضافة سائق جديد
  const handleNavigateToAddDriver = () => {
    router.push('/dashboard/drivers/add');
  };

  // التوجيه لصفحة عرض بيانات السائق
  const handleNavigateToViewDriver = (driverId: string) => {
    router.push(`/dashboard/drivers/${driverId}`);
  };

  // التوجيه لصفحة تعديل بيانات السائق
  const handleNavigateToEditDriver = (driverId: string) => {
    router.push(`/dashboard/drivers/edit/${driverId}`);
  };

  // مسح رسائل الخطأ أو النجاح
  const clearError = () => setError(null);
  const clearSuccess = () => setSuccessMessage(null);

  return {
    drivers,
    loading,
    error,
    successMessage,
    confirmDialog,
    fetchDrivers,
    handleShowDeleteConfirm,
    handleCancelDelete,
    handleConfirmDelete,
    handleNavigateToAddDriver,
    handleNavigateToViewDriver,
    handleNavigateToEditDriver,
    clearError,
    clearSuccess,
  };
}; 
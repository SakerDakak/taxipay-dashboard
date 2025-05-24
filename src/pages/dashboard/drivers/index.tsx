import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DriverProfile } from '@/types/models';
import { AccountStatus } from '@/types/enums';
import { Card, Button, Table, ConfirmDialog } from '@/components/ui';
import type { Column, TableProps } from '@/components/ui/Table';
import { useDriversPageLogic } from '@/hooks/dashboard/drivers/useDriversPageLogic'; 
import { DataListHeader, DateFormatter, StatusMessages, StatusRenderer } from '@/components/dashboard';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { MerchantCell } from '@/components/dashboard/MerchantCell';

// نوع DriverProfile يمكن استخدامه كـ Record<string, unknown>
// تم الإبقاء عليه لضمان التوافق مع نوع TableProps
type DriverProfileRecord = DriverProfile & Record<string, unknown>;

/**
 * @description صفحة إدارة السائقين.
 * تعرض هذه الصفحة قائمة بالسائقين وتوفر وظائف لإضافتهم، تعديلهم، حذفهم، وعرض تفاصيلهم.
 * تستخدم `useDriversPageLogic` لفصل المنطق عن العرض.
 */
const DriversPage: React.FC = () => {
  // استخدام الهوك للحصول على الحالات والدوال
  const {
    drivers,
    loading,
    error,
    successMessage,
    confirmDialog,
    handleShowDeleteConfirm,
    handleCancelDelete,
    handleConfirmDelete,
    handleNavigateToAddDriver,
    handleNavigateToViewDriver,
    handleNavigateToEditDriver,
    clearError,
    clearSuccess,
  } = useDriversPageLogic();

  // تعريف أعمدة جدول السائقين
  const columns: Column<DriverProfileRecord>[] = [
    {
      header: 'الاسم',
      key: 'name',
      render: (driver) => (
        <span className="font-medium text-grey-900 dark:text-white">
          {driver.name}
        </span>
      ),
      sortable: true
    },
    {
      header: 'التاجر',
      key: 'merchant_id',
      render: (driver) => (
        <MerchantCell 
          merchantId={driver.merchant_id}
        />
      ),
      sortable: true
    },
    {
      header: 'البريد الإلكتروني',
      key: 'email',
      sortable: true
    },
    {
      header: 'المدينة',
      key: 'city',
      sortable: true
    },
    {
      header: 'رقم الجوال',
      key: 'mobile',
      render: (driver) => (
        <span dir="ltr" className="text-grey-700 dark:text-grey-300">
          {driver.country_code != null ? `+${driver.country_code}` : ''} {driver.mobile}
        </span>
      ),
      sortable: true
    },
    {
      header: 'الحالة',
      key: 'status',
      render: (driver) => <StatusRenderer status={driver.status as AccountStatus} />,
      sortable: true
    },
    {
      header: 'تاريخ الإنشاء',
      key: 'created_at',
      render: (driver) => <DateFormatter date={driver.created_at as string} />,
      sortable: true
    },
    {
      header: 'الإجراءات',
      key: 'actions',
      render: (driver) => (
        <div className="flex items-center gap-1">
          <Button  
            variant="link"
            onClick={() => handleNavigateToViewDriver(driver.id)}
            title="عرض"
            aria-label={`عرض بيانات السائق ${driver.name}`}
            className="p-2 rounded-lg "
          >
            <EyeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          </Button>
          
          <Button 
            variant="link"
            onClick={() => handleNavigateToEditDriver(driver.id)}
            title="تعديل"
            aria-label={`تعديل بيانات السائق ${driver.name}`}
            className="p-2 rounded-lg "
          >
            <PencilIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
          </Button>
          
          <Button 
            variant="link"
            onClick={() => handleShowDeleteConfirm(driver.id, driver.name as string)}
            title="حذف"
            aria-label={`حذف السائق ${driver.name}`}
            className="p-2 rounded-lg "
            disabled={loading}
          >
            <TrashIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
          </Button>
        </div>
      ),
    },
  ];

  // خصائص الجدول
  // تم استخدام drivers as unknown as DriverProfileRecord[] للحفاظ على التوافق النوعي مع TableProps
  const tableProps: TableProps<DriverProfileRecord> = {
    columns,
    data: drivers as unknown as DriverProfileRecord[],
    loading,
    error: error || undefined,
    emptyMessage: "لا يوجد سائقين للعرض",
    keyExtractor: (driver) => driver.id,
    onRowClick: undefined, // يمكن تحديد دالة هنا إذا أردنا سلوكًا عند النقر على الصف
    showRowsPerPage: true,
    showSorting: true,
    showGlobalFilter: true,
    className: "border-none relative",
    onAddClick: handleNavigateToAddDriver, // استخدام الدالة من الهوك
    addButtonLabel: "إضافة سائق جديد",
    searchInputProps: {
      placeholder: "البحث في السائقين...",
      className: "block w-full md:w-80 px-5 py-2.5 rounded-xl border bg-white/50 dark:bg-grey-900/50 backdrop-blur-sm placeholder-grey-400 dark:placeholder-grey-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-grey-900 dark:text-white border-grey-300/70 dark:border-grey-700/70 pr-12",
      rightIcon: <MagnifyingGlassIcon className="h-5 w-5 text-grey-400" />
    }
  };

  return (
    <DashboardLayout>
      <DataListHeader 
        title="إدارة السائقين"
        subtitle="عرض وإضافة وتعديل وحذف حسابات السائقين في النظام"
      />
      
      {/* عرض رسائل الحالة */}
      <StatusMessages 
        error={error}
        successMessage={successMessage}
        onClearError={clearError}
        onClearSuccess={clearSuccess}
      />

      <Card className="mb-8 shadow-lg rounded-xl overflow-visible relative" variant="default">
        {/* جدول السائقين */}
        <Table {...tableProps} />
      </Card>
      
      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="تأكيد حذف السائق"
        message={`هل أنت متأكد من حذف السائق "${confirmDialog.driverName}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        confirmText="نعم، حذف"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        type="error"
      />
    </DashboardLayout>
  );
};

export default DriversPage; 
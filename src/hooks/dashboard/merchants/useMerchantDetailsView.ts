import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMerchantDetails } from './useMerchantDetails';
import { formatBase64Image } from '@/utils/imageUtils';

export const useMerchantDetailsView = () => {
  const router = useRouter();
  const { id } = router.query;
  const merchantId = typeof id === 'string' ? id : '';
  
  const { merchant, drivers, transactions, stats, loading, error } = useMerchantDetails(merchantId);
  
  // حالة لحوار تأكيد حذف السائق
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    driverId: '',
    driverName: ''
  });

  // حالة لعرض المستندات في نافذة منبثقة
  const [documentModal, setDocumentModal] = useState({
    isOpen: false,
    title: '',
    imageUrl: ''
  });

  // حالة لعرض/إخفاء قسم المستندات
  const [showDocuments, setShowDocuments] = useState(false);
  
  // زر إضافة سائق
  const handleAddDriver = () => {
    router.push(`/dashboard/drivers/add?merchant_id=${merchantId}`);
  };
  
  // زر تعديل التاجر
  const handleEditMerchant = () => {
    router.push(`/dashboard/merchants/edit/${merchantId}`);
  };

  // عرض تفاصيل السائق
  const handleViewDriver = (driverId: string) => {
    router.push(`/dashboard/drivers/${driverId}`);
  };

  // تعديل بيانات السائق
  const handleEditDriver = (driverId: string) => {
    router.push(`/dashboard/drivers/edit/${driverId}`);
  };

  // عرض حوار تأكيد حذف السائق
  const handleShowDeleteConfirm = (driverId: string, driverName: string) => {
    setConfirmDelete({
      isOpen: true,
      driverId,
      driverName
    });
  };

  // إلغاء حذف السائق
  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      driverId: '',
      driverName: ''
    });
  };

  // تأكيد حذف السائق (يمكن إضافة الكود الخاص بالحذف لاحقًا)
  const handleConfirmDelete = async () => {
    // TODO: implement delete logic
    console.log(`Deleting driver: ${confirmDelete.driverId}`);
    setConfirmDelete({
      isOpen: false,
      driverId: '',
      driverName: ''
    });
  };

  // عرض تفاصيل المعاملة
  const handleViewTransaction = (transactionId: string) => {
    router.push(`/dashboard/transactions/${transactionId}`);
  };

  // عرض المستند في نافذة منبثقة
  const handleViewDocument = (title: string, imageUrl: string) => {
    setDocumentModal({
      isOpen: true,
      title,
      imageUrl
    });
  };

  // إغلاق نافذة المستند
  const handleCloseDocumentModal = () => {
    setDocumentModal({
      isOpen: false,
      title: '',
      imageUrl: ''
    });
  };

  // تبديل عرض المستندات
  const toggleDocumentsSection = () => {
    setShowDocuments(!showDocuments);
  };

  return {
    merchant,
    drivers,
    transactions,
    stats,
    loading,
    error,
    confirmDelete,
    documentModal,
    showDocuments,
    handleAddDriver,
    handleEditMerchant,
    handleViewDriver,
    handleEditDriver,
    handleShowDeleteConfirm,
    handleCancelDelete,
    handleConfirmDelete,
    handleViewTransaction,
    handleViewDocument,
    handleCloseDocumentModal,
    toggleDocumentsSection,
    formatBase64Image
  };
}; 
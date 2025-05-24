import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { NearpayTransaction, MerchantProfile, DriverProfile } from '@/types/models';
import { NearpayService } from '@/services/nearpay/nearpayService';
import { MerchantService } from '@/services/firebase/merchantService';
import { DriverService } from '@/services/firebase/driverService';

export const useTransactionView = () => {
  const router = useRouter();
  const { id } = router.query;
  const [transaction, setTransaction] = useState<NearpayTransaction | null>(null);
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [driverError, setDriverError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!id || typeof id !== 'string') return;

      setLoading(true);
      setError(null);
      setMerchantProfile(null);
      setDriverProfile(null);
      setMerchantError(null);
      setDriverError(null);

      try {
        const txData = await NearpayService.getTransactionById(id);
        setTransaction(txData);

        const merchantIdToFetch = txData?.merchant?.id || txData?.merchant_id;
        if (merchantIdToFetch) {
          try {
            const merchant = await MerchantService.getMerchantById(merchantIdToFetch);
            if (merchant) {
                setMerchantProfile(merchant);
            } else {
                setMerchantError('لم يتم العثور على التاجر في النظام. قد يكون قد تم حذفه.');
            }
          } catch (err) {
            console.error('Error fetching merchant from Firebase:', err);
            setMerchantError('خطأ أثناء جلب بيانات التاجر. قد يكون قد تم حذفه.');
          }
        } else {
            setMerchantError('معرف التاجر غير متوفر في بيانات المعاملة.');
        }

        const driverIdToFetch = txData?.user?.id;
        if (driverIdToFetch) {
          try {
            const driver = await DriverService.getDriverById(driverIdToFetch);
            if (driver) {
                setDriverProfile(driver);
            } else {
                setDriverError('لم يتم العثور على السائق في النظام. قد يكون قد تم حذفه.');
            }
          } catch (err) {
            console.error('Error fetching driver (end user) from Firebase:', err);
            setDriverError('خطأ أثناء جلب بيانات السائق. قد يكون قد تم حذفه.');
          }
        } // No error if user.id is not present, simply don't display driver info from Firebase

      } catch (err) {
        console.error('Error fetching transaction details:', err);
        if (err instanceof Error) {
          setError(err.message || 'حدث خطأ في جلب تفاصيل المعاملة');
        } else {
          setError('حدث خطأ غير متوقع في جلب تفاصيل المعاملة');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [id]);

  const displayAmount = transaction?.amount !== undefined ? transaction.amount : (transaction?.receipts && transaction.receipts[0]?.amount_authorized?.value ? parseFloat(transaction.receipts[0].amount_authorized.value) : 'N/A');
  const displayCurrency = transaction?.currency || (transaction?.receipts && transaction.receipts[0]?.currency?.english) || '';
  const displayStatus = transaction?.status || (transaction?.receipts && transaction.receipts[0]?.status_message?.english) || 'Unknown';
  const displayType = transaction?.type || (transaction?.receipts && transaction.receipts[0]?.transaction_type?.name?.english) || 'Unknown';
  const displayMerchantId = transaction?.merchant?.id || transaction?.merchant_id || 'N/A';
  const displayDriverIdFromTx = transaction?.user?.id || (transaction?.metadata?.driver_id as string) || 'N/A';

  return {
    router,
    id,
    transaction,
    merchantProfile,
    driverProfile,
    loading,
    error,
    merchantError,
    driverError,
    displayAmount,
    displayCurrency,
    displayStatus,
    displayType,
    displayMerchantId,
    displayDriverIdFromTx,
  };
}; 
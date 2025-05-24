import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DriverService, MerchantService } from '@/services/firebase';
import { NearpayService } from '@/services/nearpay/nearpayService';
import type { DriverProfile, MerchantProfile, NearpayTransaction } from '@/types/models';
import { formatBase64Image as utilFormatBase64Image } from '@/utils/imageUtils';

interface DriverStats {
  totalTransactions: number;
  totalAmount: number;
}

export const useDriverDetailsView = () => {
  const router = useRouter();
  const driverId = typeof router.query.id === 'string' ? router.query.id : null;

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [transactions, setTransactions] = useState<NearpayTransaction[]>([]);
  const [driverStats, setDriverStats] = useState<DriverStats>({ totalTransactions: 0, totalAmount: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const formatBase64Image = useCallback((base64String: string | undefined | null) => {
    if (!base64String) return '/assets/placeholder-logo.png'; // Default placeholder
    return utilFormatBase64Image(base64String);
  }, []);

  const fetchDriverDetails = useCallback(async () => {
    if (!driverId) {
      setError("معرف السائق غير موجود.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const driverData = await DriverService.getDriverById(driverId);
      if (!driverData) {
        setError("لم يتم العثور على السائق.");
        setDriver(null);
        setMerchant(null);
        setTransactions([]);
        setDriverStats({ totalTransactions: 0, totalAmount: 0 });
        setLoading(false);
        return;
      }
      setDriver(driverData);

      if (driverData.merchant_id) {
        const merchantData = await MerchantService.getMerchantById(driverData.merchant_id);
        setMerchant(merchantData);
      } else {
        setMerchant(null);
      }

      // Nearpay's API might use user_id generally, ensure to filter for this specific driver
      const transactionResponse = await NearpayService.getTransactions({ 
        terminal_id: driverData.terminal_id || undefined, 
        limit: 100 
      });
      
      // Client-side filter for extra safety or if API doesn't perfectly match driver ID
      const driverTransactions = transactionResponse.transactions.filter(tx => 
        (driverData.terminal_id && tx.terminal?.tid === driverData.terminal_id) || // Match by terminal ID if available
        (tx.user?.id === driverId) // Or match by user ID if that's how Nearpay links them
      );
      setTransactions(driverTransactions);
      
      let totalAmount = 0;
      driverTransactions.forEach(tx => {
        const status = tx.status?.toLowerCase();
        if (tx.amount && (status === 'succeeded' || status === 'success' || status === 'approved' || status === 'accepted')) {
          totalAmount += tx.amount;
        }
      });
      setDriverStats({
        totalTransactions: driverTransactions.length,
        totalAmount: totalAmount,
      });

    } catch (err) {
      console.error("Error fetching driver details:", err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء جلب بيانات السائق.";
      setError(errorMessage);
      setDriver(null);
      setMerchant(null);
      setTransactions([]);
      setDriverStats({ totalTransactions: 0, totalAmount: 0 });
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId) {
      fetchDriverDetails();
    } else {
      setLoading(false);
    }
  }, [driverId, fetchDriverDetails]);

  const handleEditDriver = () => {
    if (driverId) {
      router.push(`/dashboard/drivers/edit/${driverId}`);
    }
  };

  const handleViewTransaction = (transactionId: string) => {
    router.push(`/dashboard/transactions/${transactionId}`);
  };

  const handleViewMerchant = () => {
    if (merchant?.id) {
      router.push(`/dashboard/merchants/${merchant.id}`);
    }
  };

  return {
    driver,
    merchant,
    transactions,
    driverStats,
    loading,
    error,
    router,
    driverId,
    handleEditDriver,
    handleViewTransaction,
    handleViewMerchant, 
    formatBase64Image,
  };
}; 
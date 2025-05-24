import { useState, useEffect } from 'react';
import { DriverService } from '@/services/firebase/driverService';
import { NearpayService } from '@/services/nearpay/nearpayService';
import { NearpayTransaction } from '@/types/models';

export interface TopDriver {
  id: string;
  name: string;
  transactionCount: number;
  percentageActivity: number;
}

export interface TopDriversResult {
  drivers: TopDriver[];
  isLoading: boolean;
  error: string | null;
}

export const useTopDrivers = (limit: number = 5) => {
  const [result, setResult] = useState<TopDriversResult>({
    drivers: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchTopDrivers = async () => {
      try {
        // جلب جميع السائقين
        const drivers = await DriverService.getDrivers();
        
        // جلب جميع المعاملات
        const allTransactions: NearpayTransaction[] = [];
        let currentPage = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
          const transactionsData = await NearpayService.getTransactions({
            page: currentPage,
            limit: 100 // جلب أكبر عدد ممكن في كل طلب
          });
          
          allTransactions.push(...transactionsData.transactions);
          
          if (transactionsData.pages && 
              transactionsData.pages.current < transactionsData.pages.total) {
            currentPage++;
          } else {
            hasMorePages = false;
          }
        }
        
        // حساب عدد المعاملات لكل سائق
        const driverTransactionCounts: Record<string, number> = {};
        let totalTransactions = 0;
        
        allTransactions.forEach(transaction => {
          if (transaction.user && transaction.user.id) {
            const driverId = transaction.user.id;
            
            // زيادة عداد المعاملات للسائق
            driverTransactionCounts[driverId] = (driverTransactionCounts[driverId] || 0) + 1;
            totalTransactions++;
          }
        });
        
        // حساب نسبة النشاط بناءً على إجمالي المعاملات
        const driversWithActivity = drivers.map(driver => {
          const transactionCount = driverTransactionCounts[driver.id] || 0;
          
          // حساب النسبة المئوية من إجمالي المعاملات
          const percentageActivity = totalTransactions > 0 
            ? Math.round((transactionCount / totalTransactions) * 100) 
            : 0;
          
          return {
            id: driver.id,
            name: driver.name,
            transactionCount,
            percentageActivity
          };
        });
        
        // ترتيب السائقين حسب عدد المعاملات وأخذ العدد المطلوب
        const topDrivers = driversWithActivity
          .sort((a, b) => b.transactionCount - a.transactionCount)
          .slice(0, limit);
        
        setResult({
          drivers: topDrivers,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching top drivers:', error);
        setResult(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'حدث خطأ أثناء جلب أفضل السائقين'
        }));
      }
    };

    fetchTopDrivers();
  }, [limit]);

  return result;
}; 
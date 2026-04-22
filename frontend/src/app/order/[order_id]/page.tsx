'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOrderQuery } from '@/hooks/useOrders';
import { useOrderWebSocket } from '@/hooks/useOrderWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ChefHat, Utensils, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useCustomerStore } from '@/store/useCustomerStore';

const STATUS_STEPS = [
  { id: 'NEW', title: 'Order Placed', icon: CheckCircle2, description: 'Sent to the kitchen' },
  { id: 'PREPARING', title: 'Preparing', icon: ChefHat, description: 'Being made fresh' },
  { id: 'READY', title: 'Ready', icon: Utensils, description: 'Waiting for waiter' },
  { id: 'SERVED', title: 'Served', icon: CheckCircle2, description: 'Enjoy your meal!' },
];

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.order_id as string | undefined;

  const { isValid } = useCustomerStore();

  // Validate session presence to prevent unauthenticated access
  useEffect(() => {
    if (!isValid()) {
      router.replace('/session-expired');
    }
  }, [isValid, router]);

  // Activate WebSocket listener for live updates
  useOrderWebSocket();

  // Fetch initial/hydrated order data
  const { data: order, isLoading, isError } = useOrderQuery(orderId || '');

  if (isLoading || !orderId) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
          <p className="text-zinc-500 font-medium tracking-tight">Locating order...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
        <p className="text-zinc-500 mb-6 font-medium text-center">We couldn&apos;t track down this order. It may have expired or is invalid.</p>
        <button 
          onClick={() => router.push('/menu')}
          className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium tracking-tight"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const currentStatusIndex = STATUS_STEPS.findIndex(s => s.id === order.status) || 0;

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 font-bold bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 py-4 flex items-center pb-safe">
        <button 
          onClick={() => router.push('/menu')}
          className="p-2 -ml-2 rounded-full active:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-900" />
        </button>
        <span className="text-lg font-bold tracking-tight ml-2">Order Status</span>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 pt-6">
        
        {/* Dynamic Status Banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={order.status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 flex flex-col items-center text-center space-y-3"
          >
            {(() => {
              const CurrentIcon = STATUS_STEPS[currentStatusIndex >= 0 ? currentStatusIndex : 0].icon;
              return (
                <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mb-2">
                  <CurrentIcon className="w-8 h-8 text-zinc-900" />
                </div>
              );
            })()}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mb-1">
                {STATUS_STEPS[currentStatusIndex >= 0 ? currentStatusIndex : 0].title}
              </h1>
              <p className="text-zinc-500 font-medium">
                {STATUS_STEPS[currentStatusIndex >= 0 ? currentStatusIndex : 0].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Stepper Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
          <h3 className="font-bold tracking-tight text-lg mb-6">Tracking Details</h3>
          <div className="space-y-6 relative">
            <div className="absolute top-3 bottom-5 left-[15px] w-0.5 bg-zinc-100" />
            
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const StepIcon = step.icon;
              
              return (
                <div key={step.id} className="relative flex items-start gap-4">
                  <motion.div 
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted ? '#18181b' : '#f4f4f5',
                      borderColor: isCompleted ? '#18181b' : '#e4e4e7',
                      color: isCompleted ? '#ffffff' : '#a1a1aa',
                      scale: isCurrent ? 1.1 : 1
                    }}
                    className="relative z-10 w-8 h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-colors"
                  >
                    <StepIcon className="w-4 h-4" />
                  </motion.div>
                  <div className="pt-1.5 flex flex-col">
                    <span className={`font-bold tracking-tight ${isCompleted ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {step.title}
                    </span>
                    {isCurrent && (
                      <motion.span 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs font-medium text-zinc-500 mt-0.5"
                      >
                        {step.description}
                      </motion.span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items Receipt Summary */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
          <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold tracking-tight">Receipt Summary</h3>
            <span className="text-xs font-bold px-2 py-1 bg-zinc-200 text-zinc-700 rounded-md">
              {order.order_id.substring(0, 8)}...
            </span>
          </div>
          <div className="p-4 space-y-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-start">
                <div className="flex gap-3">
                  <span className="font-bold text-zinc-900">{item.quantity}x</span>
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-900">{item.name}</span>
                    {item.notes && <span className="text-sm font-medium text-zinc-500 line-clamp-2">{item.notes}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
            <span className="font-bold text-zinc-500">Total</span>
            <span className="font-extrabold text-xl text-zinc-900">${order.total_price}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

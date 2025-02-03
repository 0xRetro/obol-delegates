import { Suspense } from 'react';
import TwitterLink from '@/components/TwitterLink';
import DelegateDataWrapper from '@/components/DelegateDataWrapper';
import ObolPhoneLoader from '@/components/LoadingAnimation';

export default function Home() {
  return (
    <main className="min-h-screen px-2 sm:px-4 lg:px-8 bg-gray-900 text-white">
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-gray-900">
        <div className="relative">
          <ObolPhoneLoader />
        </div>
      </div>}>
        <DelegateDataWrapper />
      </Suspense>

      {/* Fixed position banner */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-[#2FE4AB] rounded-lg shadow-lg hover:bg-[#29cd99] transition-colors">
          <TwitterLink />
        </div>
      </div>
    </main>
  );
}

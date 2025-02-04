import { NextResponse } from 'next/server';
import { acquireLock, releaseLock, getLockStatus, updateLockStep } from '@/lib/services/lockService';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const status = await getLockStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking lock status:', error);
    return NextResponse.json(
      { error: 'Failed to check lock status' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const acquired = await acquireLock();
    
    if (!acquired) {
      const status = await getLockStatus();
      return NextResponse.json(
        { 
          error: 'Lock acquisition failed',
          currentStatus: status 
        }, 
        { status: 409 } // Conflict
      );
    }

    // If step was provided, update it
    if (body.step) {
      await updateLockStep(body.step);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return NextResponse.json(
      { error: 'Failed to acquire lock' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { step } = await request.json();
    if (!step) {
      return NextResponse.json(
        { error: 'Step parameter is required' }, 
        { status: 400 }
      );
    }

    await updateLockStep(step);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating lock step:', error);
    return NextResponse.json(
      { error: 'Failed to update lock step' }, 
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await releaseLock();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error releasing lock:', error);
    return NextResponse.json(
      { error: 'Failed to release lock' }, 
      { status: 500 }
    );
  }
} 
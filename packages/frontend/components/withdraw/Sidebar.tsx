'use client';

import { Wallet, Settings, LogOut, ArrowRightLeft, Send, Home, Activity, Users } from 'lucide-react';

interface SidebarItemProps {
    icon: any;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: SidebarItemProps) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
        <span>{label}</span>
    </div>
);

type ViewType = 'dashboard' | 'transactions' | 'withdraw' | 'referrals';

interface SidebarProps {
    currentView: ViewType;
    setCurrentView: (view: ViewType) => void;
    onClose?: () => void;
}

export const SidebarContent = ({ currentView, setCurrentView, onClose }: SidebarProps) => {
    const handleViewChange = (view: ViewType) => {
        setCurrentView(view);
        if (onClose) onClose();
    };

    return (
        <div className="flex flex-col h-full py-6">
            <div className="px-4 md:px-6">
                <div
                    className="flex items-center gap-2 mb-10 px-2 cursor-pointer"
                    onClick={() => handleViewChange('dashboard')}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-[#16a34a] flex items-center justify-center text-white font-bold text-lg shadow-sm">S</div>
                    <span className="font-bold text-xl tracking-tight text-white">Safeeely</span>
                </div>

                <div className="space-y-2">
                    <SidebarItem
                        icon={Home}
                        label="Dashboard"
                        active={currentView === 'dashboard'}
                        onClick={() => handleViewChange('dashboard')}
                    />
                    <SidebarItem
                        icon={Activity}
                        label="My Transactions"
                        active={currentView === 'transactions'}
                        onClick={() => handleViewChange('transactions')}
                    />
                    <SidebarItem icon={Wallet} label="Wallet" />
                    <SidebarItem
                        icon={Send}
                        label="Withdraw"
                        active={currentView === 'withdraw'}
                        onClick={() => handleViewChange('withdraw')}
                    />
                    <SidebarItem icon={ArrowRightLeft} label="Exchange" />
                    <SidebarItem
                        icon={Users}
                        label="Referrals"
                        active={currentView === 'referrals'}
                        onClick={() => handleViewChange('referrals')}
                    />
                </div>
            </div>

            <div className="mt-auto px-4 md:px-6 space-y-2">
                <div className="h-px bg-white/10 my-4 mx-2" />
                <SidebarItem icon={Settings} label="Settings" />
                <SidebarItem icon={LogOut} label="Logout" />
            </div>
        </div>
    );
};

import {Outlet} from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ProfileCompletionModal from '../common/ProfileCompletionModal';
import {useAuth} from '../../context/AuthContext';

export default function AppLayout() {
    const {user} = useAuth();

    return (
        <div className="relative flex flex-col min-h-screen">
            <div
                className="fixed inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden select-none"
                aria-hidden="true"
            >
                <img
                    src="/logo.png"
                    alt=""
                    className="w-2/3 max-w-lg object-contain opacity-10 dark:opacity-[0.03]"
                />
            </div>

            <Navbar/>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet/>
            </main>

            <Footer/>

            {user && !user.is_profile_completed && <ProfileCompletionModal/>}
        </div>
    );
}
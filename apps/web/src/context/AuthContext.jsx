import {createContext, useContext, useState, useEffect, useCallback} from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const TOP_LEVEL_MANAGEMENT = [
    'director',
    'vice_chancellor',
    'pro_vice_chancellor',
    'dean',
];

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const loginWithGoogle = async (credential) => {
        const res = await api.post('/auth/google', {credential});
        setUser(res.data);
        return res.data;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            window.location.href = '/login';
        }
    };

    const updateUserProfileState = (updatedUser) => {
        setUser(updatedUser);
    };

    const isAdmin = user?.role === 'admin';
    const isFaculty = user?.role === 'faculty';
    const isStudent = user?.role === 'student';
    const isHod = user?.designation === 'hod';
    const isLeadership =
        isAdmin || (user?.designation && TOP_LEVEL_MANAGEMENT.includes(user.designation));

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAdmin,
                isFaculty,
                isStudent,
                isHod,
                isLeadership,
                loginWithGoogle,
                logout,
                checkAuth,
                updateUserProfileState,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
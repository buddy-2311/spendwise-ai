import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const VALID_THEMES = ['light', 'dark'];

const getSafeTheme = (theme) => {
    return VALID_THEMES.includes(theme) ? theme : 'light';
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const parsed = JSON.parse(userInfo);
            // Fallback invalid themes to 'light'
            if (parsed.theme && !VALID_THEMES.includes(parsed.theme)) {
                parsed.theme = 'light';
                localStorage.setItem('userInfo', JSON.stringify(parsed));
            }
            setUser(parsed);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        // Fallback invalid themes
        data.theme = getSafeTheme(data.theme);
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
    };

    const register = async (name, email, password) => {
        const { data } = await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
        data.theme = getSafeTheme(data.theme);
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
    };

    const updateUser = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        // Ensure theme is always valid
        newUser.theme = getSafeTheme(newUser.theme);
        setUser(newUser);
        localStorage.setItem('userInfo', JSON.stringify(newUser));
        
        document.documentElement.setAttribute('data-theme', newUser.theme);
    };

    // Apply theme on load
    useEffect(() => {
        if (user && user.theme) {
            const safeTheme = getSafeTheme(user.theme);
            document.documentElement.setAttribute('data-theme', safeTheme);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [user?.theme]);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/interfaces/types';

const AdminRoute: React.FC = () => {
    const { user } = useAuth();

    if (!user || user.role !== UserRole.ADMIN) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;

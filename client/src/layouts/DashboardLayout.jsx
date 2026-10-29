import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="bg-primary text-white rounded p-1 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
            <i className="bi bi-folder-fill"></i>
          </div>
          <span>Office CMS</span>
        </div>

        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <NavLink to="/" end className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-grid-1x2"></i>
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/records" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-collection"></i>
              <span>Records</span>
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/departments" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-buildings"></i>
              <span>Departments & Categories</span>
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/users" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-people"></i>
              <span>Users & Roles</span>
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/audit" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-shield-check"></i>
              <span>Audit Logs</span>
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="avatar-badge">
              {getInitials(user?.fullName)}
            </div>
            <div className="overflow-hidden">
              <div className="text-white small fw-bold text-truncate">{user?.fullName || 'User'}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{user?.roleName || 'Member'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 py-1"
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="top-navbar">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 d-flex align-items-center gap-1 small">
              <span className="spinner-grow spinner-grow-sm" style={{ width: 6, height: 6 }} role="status"></span>
              PostgreSQL Connected
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-muted small">
              <i className="bi bi-person-circle me-1"></i>
              <strong>{user?.email}</strong>
            </div>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

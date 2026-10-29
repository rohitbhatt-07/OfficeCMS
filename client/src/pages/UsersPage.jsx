import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role_id: 3, // Default to Staff
  });

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
      ]);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/users', formData);
      setShowModal(false);
      setFormData({ email: '', full_name: '', password: '', role_id: 3 });
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    try {
      await api.patch(`/users/${user.id}/status`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'Super Admin':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Super Admin</span>;
      case 'Admin':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Admin</span>;
      case 'Staff':
        return <span className="badge bg-info-subtle text-info border border-info-subtle">Staff</span>;
      case 'Viewer':
        return <span className="badge bg-secondary-subtle text-secondary border">Viewer</span>;
      default:
        return <span className="badge bg-light text-dark">{roleName}</span>;
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Users & Permissions</h2>
          <p className="text-muted small mb-0">Role-based access control (RBAC) and account provisioning.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
          <i className="bi bi-person-plus"></i>
          <span>Add User</span>
        </button>
      </div>

      <div className="cms-card overflow-hidden">
        <div className="table-responsive">
          <table className="cms-table mb-0">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created At</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    <span className="text-muted">Loading user accounts...</span>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="avatar-badge bg-secondary" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">{u.full_name}</div>
                          <div className="text-muted small">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(u.role_name)}</td>
                    <td>
                      {u.is_active ? (
                        <span className="badge bg-success-subtle text-success">Active</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger">Deactivated</span>
                      )}
                    </td>
                    <td className="small text-muted">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="small text-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-end">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Provision New User</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="modal-body p-4">
                  {formError && (
                    <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. Jane Doe"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      placeholder="jane@office.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Temporary Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      className="form-control"
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

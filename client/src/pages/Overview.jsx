import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats')
      .then((res) => setStats(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge-status badge-active">Active</span>;
      case 'draft':
        return <span className="badge-status badge-draft">Draft</span>;
      case 'archived':
        return <span className="badge-status badge-archived">Archived</span>;
      case 'closed':
        return <span className="badge-status badge-closed">Closed</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>System Overview</h2>
          <p className="text-muted small mb-0">Centralized office records, departments, and compliance stats.</p>
        </div>
        <Link to="/records" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
          <i className="bi bi-plus-lg"></i>
          <span>New Record</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Total Records</span>
              <div className="stat-icon-wrapper bg-primary-subtle text-primary">
                <i className="bi bi-collection"></i>
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats?.totalRecords ?? 0}</h3>
            <span className="text-success small fw-medium">
              <i className="bi bi-check-circle me-1"></i>
              {stats?.activeRecords ?? 0} Active
            </span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Departments</span>
              <div className="stat-icon-wrapper bg-info-subtle text-info">
                <i className="bi bi-buildings"></i>
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats?.departments ?? 0}</h3>
            <span className="text-muted small">Registered units</span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Categories</span>
              <div className="stat-icon-wrapper bg-warning-subtle text-warning">
                <i className="bi bi-tags"></i>
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats?.categories ?? 0}</h3>
            <span className="text-muted small">Record classifications</span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Active Users</span>
              <div className="stat-icon-wrapper bg-success-subtle text-success">
                <i className="bi bi-people"></i>
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats?.activeUsers ?? 0}</h3>
            <span className="text-muted small">Authorized personnel</span>
          </div>
        </div>
      </div>

      {/* Split Section: Recent Records & Activity */}
      <div className="row g-4">
        {/* Recent Records */}
        <div className="col-12 col-lg-8">
          <div className="cms-card">
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold fs-6">Recent Records</h5>
              <Link to="/records" className="text-primary small text-decoration-none fw-semibold">
                View all &rarr;
              </Link>
            </div>
            <div className="table-responsive">
              <table className="cms-table mb-0">
                <thead>
                  <tr>
                    <th>Ref Number</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentRecords && stats.recentRecords.length > 0 ? (
                    stats.recentRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="fw-semibold text-primary font-monospace small">{r.reference_number || `#${r.id}`}</td>
                        <td className="fw-medium">{r.title}</td>
                        <td><span className="badge bg-light text-dark border">{r.category_name || 'General'}</span></td>
                        <td className="text-secondary">{r.department_name || '—'}</td>
                        <td>{getStatusBadge(r.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        <i className="bi bi-inbox fs-3 d-block mb-1"></i>
                        No records created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit / Activity Stream */}
        <div className="col-12 col-lg-4">
          <div className="cms-card h-100">
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold fs-6">System Audit Stream</h5>
              <Link to="/audit" className="text-primary small text-decoration-none fw-semibold">
                Details &rarr;
              </Link>
            </div>
            <div className="p-3">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {stats.recentActivity.map((log) => (
                    <div key={log.id} className="d-flex align-items-start gap-2 border-bottom pb-2">
                      <div className="badge bg-primary-subtle text-primary mt-1 p-1">
                        <i className="bi bi-clock-history"></i>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fw-semibold small font-monospace">{log.action}</span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-muted small text-truncate">
                          {log.user_email || 'System'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted small">
                  No activity recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

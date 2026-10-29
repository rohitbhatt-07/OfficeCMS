import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit', { params: { limit: 100 } });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = filterAction
    ? logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()))
    : logs;

  const getActionBadge = (action) => {
    if (action.includes('create')) return <span className="badge bg-success-subtle text-success border">{action}</span>;
    if (action.includes('update')) return <span className="badge bg-primary-subtle text-primary border">{action}</span>;
    if (action.includes('delete')) return <span className="badge bg-danger-subtle text-danger border">{action}</span>;
    if (action.includes('failed')) return <span className="badge bg-warning-subtle text-warning border">{action}</span>;
    return <span className="badge bg-light text-dark border">{action}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Security & Audit Trail</h2>
          <p className="text-muted small mb-0">Append-only compliance log tracking all sensitive actions in the CMS.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
          <i className="bi bi-arrow-clockwise"></i>
          <span>Refresh</span>
        </button>
      </div>

      <div className="cms-card p-3 mb-4">
        <div className="input-group" style={{ maxWidth: 350 }}>
          <span className="input-group-text bg-white border-end-0 text-muted">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Filter by action (e.g. record.create, auth.login)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          />
        </div>
      </div>

      <div className="cms-card overflow-hidden">
        <div className="table-responsive">
          <table className="cms-table mb-0">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    <span className="text-muted">Loading audit entries...</span>
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="small text-muted font-monospace">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="fw-semibold text-dark small">
                      {log.user_email || 'Anonymous / System'}
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td className="small text-secondary">
                      {log.resource_type ? `${log.resource_type} #${log.resource_id || ''}` : '—'}
                    </td>
                    <td className="small text-muted font-monospace" style={{ maxWidth: 280 }}>
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="small text-muted font-monospace">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

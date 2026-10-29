import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Records() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [activeRecord, setActiveRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    reference_number: '',
    category_id: '',
    department_id: '',
    record_date: new Date().toISOString().slice(0, 10),
    status: 'active',
    description: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, catRes, deptRes] = await Promise.all([
        api.get('/records', {
          params: {
            q: search,
            category_id: selectedCategory || undefined,
            department_id: selectedDepartment || undefined,
            status: selectedStatus || undefined,
          },
        }),
        api.get('/categories'),
        api.get('/departments'),
      ]);

      setRecords(recRes.data.records);
      setCategories(catRes.data.categories);
      setDepartments(deptRes.data.departments);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, selectedDepartment, selectedStatus]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      title: '',
      reference_number: '',
      category_id: categories[0]?.id || '',
      department_id: departments[0]?.id || '',
      record_date: new Date().toISOString().slice(0, 10),
      status: 'active',
      description: '',
      notes: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setModalMode('edit');
    setActiveRecord(rec);
    setFormData({
      title: rec.title,
      reference_number: rec.reference_number || '',
      category_id: rec.category_id || '',
      department_id: rec.department_id || '',
      record_date: rec.record_date ? rec.record_date.slice(0, 10) : '',
      status: rec.status,
      description: rec.description || '',
      notes: rec.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenView = (rec) => {
    setModalMode('view');
    setActiveRecord(rec);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        await api.post('/records', formData);
      } else if (modalMode === 'edit') {
        await api.put(`/records/${activeRecord.id}`, formData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/records/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete record');
    }
  };

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

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Records Management</h2>
          <p className="text-muted small mb-0">Search, categorize, and archive company documentation and files.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
          <i className="bi bi-plus-lg"></i>
          <span>Create Record</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="cms-card p-3 mb-4">
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search title, reference #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-2">
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="cms-card overflow-hidden">
        <div className="table-responsive">
          <table className="cms-table mb-0">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Title</th>
                <th>Category</th>
                <th>Department</th>
                <th>Record Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    <span className="text-muted">Loading records...</span>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold text-primary font-monospace small">
                      {r.reference_number || `REC-${r.id}`}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{r.title}</div>
                      {r.description && (
                        <div className="text-muted small text-truncate" style={{ maxWidth: 300 }}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {r.category_name || 'General'}
                      </span>
                    </td>
                    <td className="text-secondary">{r.department_name || '—'}</td>
                    <td className="text-secondary small">
                      {r.record_date ? new Date(r.record_date).toLocaleDateString() : '—'}
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => handleOpenView(r)}
                          className="btn btn-outline-secondary"
                          title="View"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="btn btn-outline-secondary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="btn btn-outline-danger"
                          title="Delete"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    No records found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {modalMode === 'create' && 'Create New Record'}
                  {modalMode === 'edit' && 'Edit Record'}
                  {modalMode === 'view' && 'Record Details'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              {modalMode === 'view' ? (
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Reference Number</span>
                      <strong className="font-monospace text-primary">{activeRecord?.reference_number}</strong>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Status</span>
                      {getStatusBadge(activeRecord?.status)}
                    </div>
                    <div className="col-12">
                      <span className="text-muted small d-block">Title</span>
                      <h5 className="fw-bold">{activeRecord?.title}</h5>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Category</span>
                      <span>{activeRecord?.category_name || 'General'}</span>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Department</span>
                      <span>{activeRecord?.department_name || 'Unassigned'}</span>
                    </div>
                    <div className="col-12">
                      <span className="text-muted small d-block">Description</span>
                      <p className="bg-light p-3 rounded border text-secondary mb-0">
                        {activeRecord?.description || 'No description provided.'}
                      </p>
                    </div>
                    {activeRecord?.notes && (
                      <div className="col-12">
                        <span className="text-muted small d-block">Internal Notes</span>
                        <p className="bg-light p-3 rounded border text-muted small mb-0">
                          {activeRecord.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4">
                    {formError && (
                      <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                    )}

                    <div className="row g-3">
                      <div className="col-12 col-md-8">
                        <label className="form-label small fw-semibold">Title *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          placeholder="e.g. Master Service Agreement 2026"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Reference Number</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          placeholder="Auto-generated if blank"
                          value={formData.reference_number}
                          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Category</label>
                        <select
                          className="form-select"
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        >
                          <option value="">Select Category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Department</label>
                        <select
                          className="form-select"
                          value={formData.department_id}
                          onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        >
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Status</label>
                        <select
                          className="form-select"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold">Description</label>
                        <textarea
                          rows="3"
                          className="form-control"
                          placeholder="Summary or details of this record..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold">Internal Notes</label>
                        <textarea
                          rows="2"
                          className="form-control"
                          placeholder="Confidential or office notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="btn btn-primary">
                      {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Record' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

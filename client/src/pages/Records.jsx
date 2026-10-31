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
  const [selectedIssueFilter, setSelectedIssueFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [activeRecord, setActiveRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Initial Form Data template matching the handwritten A4 sheet:
  // Name, Deptt, Designation (Assistant Prof., Associate Prof., Professor),
  // Issue (Printer, Desktop -> CPU / Monitor), Service Tag / Serial no.,
  // Contact, Date of issue, Voucher / Reference no., Image
  const getInitialFormData = () => ({
    title: '',
    reference_number: '',
    category_id: categories[0]?.id || '',
    department_id: departments[0]?.id || '',
    record_date: new Date().toISOString().slice(0, 10),
    status: 'active',
    description: '',
    notes: '',
    custom_fields: {
      requester_name: '',
      designation: 'Assistant Prof.',
      issue_type: 'Desktop',
      desktop_component: 'CPU',
      service_tag: '',
      contact: '',
      image: '',
      image_name: '',
    },
  });

  const [formData, setFormData] = useState(getInitialFormData());

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

      setRecords(recRes.data.records || []);
      setCategories(catRes.data.categories || []);
      setDepartments(deptRes.data.departments || []);
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
      custom_fields: {
        requester_name: '',
        designation: 'Assistant Prof.',
        issue_type: 'Desktop',
        desktop_component: 'CPU',
        service_tag: '',
        contact: '',
        image: '',
        image_name: '',
      },
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setModalMode('edit');
    setActiveRecord(rec);
    const cf = rec.custom_fields || {};
    setFormData({
      title: rec.title || '',
      reference_number: rec.reference_number || '',
      category_id: rec.category_id || '',
      department_id: rec.department_id || '',
      record_date: rec.record_date ? rec.record_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: rec.status || 'active',
      description: rec.description || '',
      notes: rec.notes || '',
      custom_fields: {
        requester_name: cf.requester_name || '',
        designation: cf.designation || 'Assistant Prof.',
        issue_type: cf.issue_type || 'Desktop',
        desktop_component: cf.desktop_component || 'CPU',
        service_tag: cf.service_tag || '',
        contact: cf.contact || '',
        image: cf.image || '',
        image_name: cf.image_name || '',
      },
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenView = (rec) => {
    setModalMode('view');
    setActiveRecord(rec);
    setShowModal(true);
  };

  // Image upload with in-browser canvas compression (fast, lightweight, responsive)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1200;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

        setFormData((prev) => ({
          ...prev,
          custom_fields: {
            ...prev.custom_fields,
            image: compressedDataUrl,
            image_name: file.name,
          },
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        image: '',
        image_name: '',
      },
    }));
  };

  const handleQuickAddDept = async () => {
    const deptName = window.prompt('Enter new department name (e.g. Physics, Computer Science):');
    if (!deptName || !deptName.trim()) return;
    try {
      const res = await api.post('/departments', { name: deptName.trim(), is_active: true });
      const newDept = res.data.department;
      setDepartments((prev) => [...prev, newDept]);
      setFormData((prev) => ({ ...prev, department_id: newDept.id }));
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to add department');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      // Auto-generate title if user left it blank: e.g. "Desktop (CPU) - Dr. Sharma"
      let finalTitle = formData.title.trim();
      const cf = formData.custom_fields;
      if (!finalTitle) {
        const issuePart = cf.issue_type === 'Desktop'
          ? `Desktop (${cf.desktop_component || 'System'})`
          : (cf.issue_type || 'General Issue');
        const namePart = cf.requester_name ? ` - ${cf.requester_name}` : '';
        const tagPart = cf.service_tag ? ` [${cf.service_tag}]` : '';
        finalTitle = `${issuePart}${namePart}${tagPart}`;
      }

      const payload = {
        ...formData,
        title: finalTitle,
      };

      if (modalMode === 'create') {
        await api.post('/records', payload);
      } else if (modalMode === 'edit') {
        await api.put(`/records/${activeRecord.id}`, payload);
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

  // Optional client-side issue filter
  const displayedRecords = selectedIssueFilter
    ? records.filter((r) => r.custom_fields?.issue_type === selectedIssueFilter)
    : records;

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Records Management</h2>
          <p className="text-muted small mb-0">
            Search, categorize, and archive company documentation, IT complaints, and equipment records.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
          <i className="bi bi-plus-lg"></i>
          <span>+ Create Record</span>
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
                placeholder="Search title, reference #, name, service tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-2">
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

          <div className="col-6 col-md-2">
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

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={selectedIssueFilter}
              onChange={(e) => setSelectedIssueFilter(e.target.value)}
            >
              <option value="">All Issues</option>
              <option value="Printer">Printer</option>
              <option value="Desktop">Desktop (CPU/Monitor)</option>
              <option value="Laptop">Laptop</option>
              <option value="Network">Network</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
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
                <th style={{ width: '130px' }}>REFERENCE #</th>
                <th>TITLE / REQUESTER</th>
                <th>ISSUE & SERVICE TAG</th>
                <th>CATEGORY</th>
                <th>DEPARTMENT</th>
                <th>RECORD DATE</th>
                <th>STATUS</th>
                <th className="text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    <span className="text-muted">Loading records...</span>
                  </td>
                </tr>
              ) : displayedRecords.length > 0 ? (
                displayedRecords.map((r) => {
                  const cf = r.custom_fields || {};
                  return (
                    <tr key={r.id}>
                      {/* Reference / Voucher # */}
                      <td className="fw-semibold text-primary font-monospace small">
                        {r.reference_number || `${r.id}`}
                      </td>

                      {/* Title & Requester Info */}
                      <td>
                        <div className="fw-semibold text-dark">{r.title}</div>
                        {cf.requester_name && (
                          <div className="text-muted small mt-1 d-flex align-items-center gap-1 flex-wrap">
                            <span className="text-dark fw-medium">👤 {cf.requester_name}</span>
                            {cf.designation && (
                              <span className="badge bg-light text-secondary border px-1 py-0" style={{ fontSize: '0.75rem' }}>
                                {cf.designation}
                              </span>
                            )}
                            {cf.contact && (
                              <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
                                📞 {cf.contact}
                              </span>
                            )}
                          </div>
                        )}
                        {r.description && !cf.requester_name && (
                          <div className="text-muted small text-truncate" style={{ maxWidth: 280 }}>
                            {r.description}
                          </div>
                        )}
                      </td>

                      {/* Issue Type & Service Tag & Image indicator */}
                      <td>
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          {cf.issue_type ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              {cf.issue_type}
                              {cf.issue_type === 'Desktop' && cf.desktop_component ? ` (${cf.desktop_component})` : ''}
                            </span>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}

                          {cf.service_tag && (
                            <span className="badge bg-light text-dark border font-monospace" title="Service Tag / Serial No.">
                              ST: {cf.service_tag}
                            </span>
                          )}

                          {cf.image && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal(cf.image)}
                              className="btn btn-sm btn-outline-info py-0 px-1 border-0"
                              title="Click to view uploaded photo"
                            >
                              <img
                                src={cf.image}
                                alt="Thumb"
                                style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }}
                              />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="badge bg-light text-dark border">
                          {r.category_name || 'General'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="text-secondary">{r.department_name || '—'}</td>

                      {/* Record Date (Date of Issue) */}
                      <td className="text-secondary small">
                        {r.record_date ? new Date(r.record_date).toLocaleDateString() : '—'}
                      </td>

                      {/* Status */}
                      <td>{getStatusBadge(r.status)}</td>

                      {/* Actions */}
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={() => handleOpenView(r)}
                            className="btn btn-outline-secondary"
                            title="View Details"
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    No records found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Record Modal (Create, Edit, View) */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {modalMode === 'create' && 'Create Record / Service Slip'}
                  {modalMode === 'edit' && 'Edit Record'}
                  {modalMode === 'view' && 'Record & Service Details'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              {/* VIEW MODE */}
              {modalMode === 'view' ? (
                <div className="modal-body p-4" style={{ overflowY: 'auto', maxHeight: '72vh' }}>
                  <div className="row g-3">
                    {/* Voucher / Ref No. & Status */}
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Voucher / Reference No.</span>
                      <strong className="font-monospace text-primary fs-5">
                        {activeRecord?.reference_number || `REC-${activeRecord?.id}`}
                      </strong>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Status</span>
                      {getStatusBadge(activeRecord?.status)}
                    </div>

                    <div className="col-12">
                      <hr className="my-2" />
                    </div>

                    {/* Requester & Faculty Details */}
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Requester Name</span>
                      <div className="fw-semibold text-dark fs-6">
                        {activeRecord?.custom_fields?.requester_name || '—'}
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Designation</span>
                      <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                        {activeRecord?.custom_fields?.designation || '—'}
                      </span>
                    </div>

                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Department</span>
                      <span className="fw-medium">{activeRecord?.department_name || 'Unassigned'}</span>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Contact</span>
                      <span>{activeRecord?.custom_fields?.contact || '—'}</span>
                    </div>

                    <div className="col-12">
                      <hr className="my-2" />
                    </div>

                    {/* Issue & Hardware Details */}
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Issue Type</span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-6">
                        {activeRecord?.custom_fields?.issue_type || '—'}
                        {activeRecord?.custom_fields?.issue_type === 'Desktop' && activeRecord?.custom_fields?.desktop_component
                          ? ` (${activeRecord.custom_fields.desktop_component})`
                          : ''}
                      </span>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Service Tag / Serial No.</span>
                      <strong className="font-monospace text-dark">
                        {activeRecord?.custom_fields?.service_tag || '—'}
                      </strong>
                    </div>

                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Date of Issue</span>
                      <span>
                        {activeRecord?.record_date
                          ? new Date(activeRecord.record_date).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted small d-block">Category</span>
                      <span>{activeRecord?.category_name || 'General'}</span>
                    </div>

                    {/* Title */}
                    <div className="col-12">
                      <span className="text-muted small d-block">Subject / Title</span>
                      <h6 className="fw-bold text-dark">{activeRecord?.title}</h6>
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <span className="text-muted small d-block">Description / Problem Symptoms</span>
                      <p className="bg-light p-3 rounded border text-secondary mb-0">
                        {activeRecord?.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Notes */}
                    {activeRecord?.notes && (
                      <div className="col-12">
                        <span className="text-muted small d-block">Internal Office Notes</span>
                        <p className="bg-light p-3 rounded border text-muted small mb-0">
                          {activeRecord.notes}
                        </p>
                      </div>
                    )}

                    {/* Uploaded Image / Photo */}
                    {activeRecord?.custom_fields?.image && (
                      <div className="col-12">
                        <span className="text-muted small d-block mb-2">Attached Image / Photo</span>
                        <div
                          className="p-2 border rounded bg-light text-center cursor-pointer"
                          style={{ maxWidth: 400 }}
                          onClick={() => setPreviewImageModal(activeRecord.custom_fields.image)}
                        >
                          <img
                            src={activeRecord.custom_fields.image}
                            alt="Issue Attachment"
                            className="img-fluid rounded shadow-sm"
                            style={{ maxHeight: 240, objectFit: 'contain' }}
                          />
                          <div className="small text-muted mt-2">
                            <i className="bi bi-zoom-in me-1"></i> Click photo to view full size
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* CREATE & EDIT FORM */
                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}
                >
                  <div className="modal-body p-4" style={{ overflowY: 'auto', maxHeight: '72vh' }}>
                    {formError && (
                      <div className="alert alert-danger py-2 small mb-3">{formError}</div>
                    )}

                    {/* SECTION 1: Requester Details */}
                    <div className="card mb-3 border bg-light-subtle">
                      <div className="card-header bg-white py-2 fw-semibold small text-primary d-flex align-items-center gap-1">
                        <i className="bi bi-person-badge"></i>
                        <span>Requester & Department Details</span>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          {/* Name */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Name *</label>
                            <input
                              type="text"
                              required
                              className="form-control"
                              placeholder="e.g. Dr. Rajesh Sharma"
                              value={formData.custom_fields.requester_name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, requester_name: e.target.value },
                                })
                              }
                            />
                          </div>

                          {/* Designation */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Designation *</label>
                            <select
                              className="form-select"
                              value={formData.custom_fields.designation}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, designation: e.target.value },
                                })
                              }
                            >
                              <option value="Assistant Prof.">Assistant Prof.</option>
                              <option value="Associate Prof.">Associate Prof.</option>
                              <option value="Professor">Professor</option>
                              <option value="Staff">Staff</option>
                              <option value="HOD">HOD</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Department */}
                          <div className="col-12 col-md-6">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <label className="form-label small fw-semibold mb-0">Deptt (Department) *</label>
                              <button
                                type="button"
                                onClick={handleQuickAddDept}
                                className="btn btn-link btn-sm p-0 text-decoration-none fw-medium"
                                style={{ fontSize: '0.78rem' }}
                              >
                                + Add Dept
                              </button>
                            </div>
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

                          {/* Contact */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Contact (Phone / Mobile)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. +91 98765 43210 / Ext 402"
                              value={formData.custom_fields.contact}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, contact: e.target.value },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Issue & Equipment Details */}
                    <div className="card mb-3 border bg-light-subtle">
                      <div className="card-header bg-white py-2 fw-semibold small text-primary d-flex align-items-center gap-1">
                        <i className="bi bi-tools"></i>
                        <span>Issue & Equipment Details</span>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          {/* Issue Type */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Issue *</label>
                            <select
                              className="form-select"
                              value={formData.custom_fields.issue_type}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, issue_type: e.target.value },
                                })
                              }
                            >
                              <option value="Desktop">Desktop</option>
                              <option value="Printer">Printer</option>
                              <option value="Laptop">Laptop</option>
                              <option value="Network / Wi-Fi">Network / Wi-Fi</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Desktop Component (CPU / Monitor / Both) */}
                          {formData.custom_fields.issue_type === 'Desktop' && (
                            <div className="col-12 col-md-6">
                              <label className="form-label small fw-semibold">Desktop Component</label>
                              <select
                                className="form-select"
                                value={formData.custom_fields.desktop_component}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    custom_fields: { ...formData.custom_fields, desktop_component: e.target.value },
                                  })
                                }
                              >
                                <option value="CPU">CPU</option>
                                <option value="Monitor">Monitor</option>
                                <option value="Both (CPU & Monitor)">Both (CPU & Monitor)</option>
                              </select>
                            </div>
                          )}

                          {/* Service Tag / Serial no. */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Service Tag / Serial no.</label>
                            <input
                              type="text"
                              className="form-control font-monospace"
                              placeholder="e.g. DELL-583920 / SN-20391"
                              value={formData.custom_fields.service_tag}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, service_tag: e.target.value },
                                })
                              }
                            />
                          </div>

                          {/* Voucher / Reference no. */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Voucher / Reference no.</label>
                            <input
                              type="text"
                              className="form-control font-monospace"
                              placeholder="e.g. 5655 (Auto-generated if empty)"
                              value={formData.reference_number}
                              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                            />
                          </div>

                          {/* Date of Issue */}
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Date of issue</label>
                            <input
                              type="date"
                              className="form-control"
                              value={formData.record_date}
                              onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                            />
                          </div>

                          {/* Category & Status */}
                          <div className="col-12 col-md-3">
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

                          <div className="col-12 col-md-3">
                            <label className="form-label small fw-semibold">Status</label>
                            <select
                              className="form-select"
                              value={formData.status}
                              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                              <option value="active">Active</option>
                              <option value="draft">Draft</option>
                              <option value="closed">Closed</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Image / Photo of Issue */}
                    <div className="card mb-3 border bg-light-subtle">
                      <div className="card-header bg-white py-2 fw-semibold small text-primary d-flex align-items-center gap-1">
                        <i className="bi bi-image"></i>
                        <span>Image / Photo Attachment</span>
                      </div>
                      <div className="card-body">
                        {formData.custom_fields.image ? (
                          <div className="d-flex align-items-center gap-3">
                            <img
                              src={formData.custom_fields.image}
                              alt="Attachment preview"
                              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }}
                            />
                            <div>
                              <div className="fw-medium small text-dark">
                                {formData.custom_fields.image_name || 'Attached Photo'}
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="btn btn-sm btn-outline-danger mt-1"
                              >
                                <i className="bi bi-trash me-1"></i> Remove Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              className="form-control"
                              onChange={handleImageUpload}
                            />
                            <div className="form-text small">
                              Attach a photo of the equipment, issue, or printed voucher (JPG, PNG, WEBP).
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 4: Title, Description, & Notes */}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label small fw-semibold">
                          Subject / Title <span className="text-muted fw-normal">(Optional, auto-generated if blank)</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Desktop CPU Not Powering On - Room 204"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold">Description / Problem Details</label>
                        <textarea
                          rows="2"
                          className="form-control"
                          placeholder="Describe the issue, symptoms, error codes..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold">Internal Notes</label>
                        <textarea
                          rows="2"
                          className="form-control"
                          placeholder="Technician or office internal notes..."
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
                    <button type="submit" disabled={submitting} className="btn btn-primary shadow-sm">
                      {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Record' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for full image viewing */}
      {previewImageModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-transparent border-0 text-center">
              <div className="d-flex justify-content-end p-2">
                <button
                  type="button"
                  className="btn btn-close btn-close-white"
                  onClick={() => setPreviewImageModal(null)}
                ></button>
              </div>
              <img
                src={previewImageModal}
                alt="Enlarged preview"
                className="img-fluid rounded shadow-lg mx-auto"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

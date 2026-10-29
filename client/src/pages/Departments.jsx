import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Department Form
  const [newDeptName, setNewDeptName] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);
  const [deptError, setDeptError] = useState('');

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catError, setCatError] = useState('');

  const fetchData = async () => {
    try {
      const [deptRes, catRes] = await Promise.all([
        api.get('/departments'),
        api.get('/categories'),
      ]);
      setDepartments(deptRes.data.departments);
      setCategories(catRes.data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDeptError('');
    setDeptSubmitting(true);
    try {
      await api.post('/departments', { name: newDeptName.trim(), is_active: true });
      setNewDeptName('');
      fetchData();
    } catch (err) {
      setDeptError(err.response?.data?.error || err.message || 'Failed to create department');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatError('');
    setCatSubmitting(true);
    try {
      await api.post('/categories', { name: newCatName.trim(), description: newCatDesc.trim(), is_active: true });
      setNewCatName('');
      setNewCatDesc('');
      fetchData();
    } catch (err) {
      setCatError(err.response?.data?.error || err.message || 'Failed to create category');
    } finally {
      setCatSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Departments & Categories</h2>
        <p className="text-muted small mb-0">Organize and classify office operations, workflows, and records.</p>
      </div>

      <div className="row g-4">
        {/* Departments Column */}
        <div className="col-12 col-lg-6">
          <div className="cms-card mb-4">
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold fs-6">
                <i className="bi bi-buildings text-primary me-2"></i>
                Departments ({departments.length})
              </h5>
            </div>
            <div className="p-3">
              <form onSubmit={handleCreateDept} className="mb-3">
                {deptError && <div className="alert alert-danger py-1 small mb-2">{deptError}</div>}
                <div className="input-group">
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="New department name..."
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                  />
                  <button type="submit" disabled={deptSubmitting} className="btn btn-primary">
                    {deptSubmitting ? 'Adding...' : 'Add Dept'}
                  </button>
                </div>
              </form>

              <div className="list-group list-group-flush">
                {departments.map((d) => (
                  <div key={d.id} className="list-group-item d-flex align-items-center justify-content-between px-0 py-2">
                    <div>
                      <span className="fw-semibold text-dark">{d.name}</span>
                      <span className="badge bg-success-subtle text-success ms-2" style={{ fontSize: '0.7rem' }}>Active</span>
                    </div>
                    <span className="badge bg-light text-dark border">
                      {d.record_count ?? 0} records
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories Column */}
        <div className="col-12 col-lg-6">
          <div className="cms-card mb-4">
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold fs-6">
                <i className="bi bi-tags text-warning me-2"></i>
                Record Categories ({categories.length})
              </h5>
            </div>
            <div className="p-3">
              <form onSubmit={handleCreateCategory} className="mb-3">
                {catError && <div className="alert alert-danger py-1 small mb-2">{catError}</div>}
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="Category name..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Description..."
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                      />
                      <button type="submit" disabled={catSubmitting} className="btn btn-primary">
                        {catSubmitting ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              <div className="list-group list-group-flush">
                {categories.map((c) => (
                  <div key={c.id} className="list-group-item px-0 py-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-semibold text-dark">{c.name}</span>
                      <span className="badge bg-light text-dark border">
                        {c.record_count ?? 0} records
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-muted small mb-0 mt-1">{c.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoAdmin = () => {
    setEmail('rohitbhatt0704@gmail.com');
    setPassword('Rohitbhatt@12');
  };

  return (
    <div className="login-page">
      <div className="login-box shadow-lg">
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3 shadow" style={{ width: 56, height: 56 }}>
            <i className="bi bi-folder2-open fs-3"></i>
          </div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Office CMS</h2>
          <p className="text-muted small">Sign in with your enterprise credentials</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary">Work Email</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                required
                className="form-control border-start-0 ps-0"
                placeholder="name@office.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-lock"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-control border-start-0 border-end-0 ps-0"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-group-text bg-light border-start-0 text-muted"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100 py-2 fw-semibold mt-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
          >
            {loading && <span className="spinner-border spinner-border-sm"></span>}
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-3 border-top text-center">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1"
            onClick={handleUseDemoAdmin}
          >
            <i className="bi bi-key me-1"></i> Quick Fill Seeded Admin
          </button>
        </div>
      </div>
    </div>
  );
}

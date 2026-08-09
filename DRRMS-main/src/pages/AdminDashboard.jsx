import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, apiFetch } from '../config/api';
import '../styles/AdminDashboard.css';

const RESOURCE_TYPES = ['food', 'water', 'medical', 'clothing', 'other'];
const WEATHER_ALERTS = ['none', 'yellow', 'orange', 'red'];

const emptyResourceForm = {
  name: '',
  type: 'food',
  quantity: 0,
  unit: '',
  location_id: '',
};

const emptyShelterForm = {
  name: '',
  location_id: '',
  capacity: 0,
  current_occupancy: 0,
  contact_number: '',
};

const emptyLocationForm = {
  name: '',
  region: '',
  latitude: '',
  longitude: '',
  weather_condition: '',
  weather_alert: 'none',
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resources');
  const [resources, setResources] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [resourceLogs, setResourceLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);

  const [showShelterModal, setShowShelterModal] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null);
  const [shelterForm, setShelterForm] = useState(emptyShelterForm);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchLocations = async () => {
    try {
      const res = await apiFetch(`${API_URL}/locations`);
      const data = await res.json();
      setLocations(data);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'resources':
          await fetchLocations();
          const resRes = await apiFetch(`${API_URL}/resources`);
          const resData = await resRes.json();
          setResources(resData);
          break;
        case 'shelters':
          await fetchLocations();
          const shelRes = await apiFetch(`${API_URL}/shelters`);
          const shelData = await shelRes.json();
          setShelters(shelData);
          break;
        case 'locations':
          await fetchLocations();
          break;
        case 'volunteers':
          const volRes = await apiFetch(`${API_URL}/users`);
          const volData = await volRes.json();
          setVolunteers(volData.filter(user => user.role === 'volunteer'));
          break;
        case 'requests':
          const reqRes = await apiFetch(`${API_URL}/admin/requests`);
          const reqData = await reqRes.json();
          setRequests(reqData);
          break;
        case 'audit':
          const auditRes = await apiFetch(`${API_URL}/audit_log`);
          const auditData = await auditRes.json();
          setAuditLogs(auditData);
          break;
        case 'resourceLogs':
          const logRes = await apiFetch(`${API_URL}/resource_audit_log`);
          const logData = await logRes.json();
          setResourceLogs(logData);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openResourceModal = (resource = null) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        name: resource.name,
        type: resource.type,
        quantity: resource.quantity ?? 0,
        unit: resource.unit || '',
        location_id: resource.location_id || '',
      });
    } else {
      setEditingResource(null);
      setResourceForm(emptyResourceForm);
    }
    setShowResourceModal(true);
    setError('');
  };

  const closeResourceModal = () => {
    setShowResourceModal(false);
    setEditingResource(null);
    setResourceForm(emptyResourceForm);
  };

  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: resourceForm.name.trim(),
      type: resourceForm.type,
      quantity: Number(resourceForm.quantity),
      unit: resourceForm.unit.trim() || null,
      location_id: resourceForm.location_id ? Number(resourceForm.location_id) : null,
    };

    try {
      const url = editingResource
        ? `${API_URL}/resources/${editingResource.id}`
        : `${API_URL}/resources`;
      const method = editingResource ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save resource');
      }

      closeResourceModal();
      showSuccess(editingResource ? 'Resource updated successfully' : 'Resource added successfully');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    setError('');
    try {
      const response = await apiFetch(`${API_URL}/resources/${resourceId}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete resource');
      }

      showSuccess('Resource deleted successfully');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openShelterModal = (shelter = null) => {
    if (shelter) {
      setEditingShelter(shelter);
      setShelterForm({
        name: shelter.name,
        location_id: shelter.location_id || '',
        capacity: shelter.capacity ?? 0,
        current_occupancy: shelter.current_occupancy ?? 0,
        contact_number: shelter.contact_number || '',
      });
    } else {
      setEditingShelter(null);
      setShelterForm(emptyShelterForm);
    }
    setShowShelterModal(true);
    setError('');
  };

  const closeShelterModal = () => {
    setShowShelterModal(false);
    setEditingShelter(null);
    setShelterForm(emptyShelterForm);
  };

  const handleShelterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: shelterForm.name.trim(),
      location_id: Number(shelterForm.location_id),
      capacity: Number(shelterForm.capacity),
      current_occupancy: Number(shelterForm.current_occupancy),
      contact_number: shelterForm.contact_number.trim() || null,
    };

    try {
      const url = editingShelter
        ? `${API_URL}/shelters/${editingShelter.id}`
        : `${API_URL}/shelters`;
      const method = editingShelter ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save shelter');
      }

      closeShelterModal();
      showSuccess(editingShelter ? 'Shelter updated successfully' : 'Shelter added successfully');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteShelter = async (shelterId) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) {
      return;
    }

    setError('');
    try {
      const response = await apiFetch(`${API_URL}/shelters/${shelterId}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete shelter');
      }

      showSuccess('Shelter deleted successfully');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openLocationModal = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        name: location.name,
        region: location.region || '',
        latitude: location.latitude ?? '',
        longitude: location.longitude ?? '',
        weather_condition: location.weather_condition || '',
        weather_alert: location.weather_alert || 'none',
      });
    } else {
      setEditingLocation(null);
      setLocationForm(emptyLocationForm);
    }
    setShowLocationModal(true);
    setError('');
  };

  const closeLocationModal = () => {
    setShowLocationModal(false);
    setEditingLocation(null);
    setLocationForm(emptyLocationForm);
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: locationForm.name.trim(),
      region: locationForm.region.trim() || null,
      latitude: locationForm.latitude !== '' ? Number(locationForm.latitude) : null,
      longitude: locationForm.longitude !== '' ? Number(locationForm.longitude) : null,
      weather_condition: locationForm.weather_condition.trim() || null,
      weather_alert: locationForm.weather_alert,
    };

    try {
      const url = editingLocation
        ? `${API_URL}/locations/${editingLocation.id}`
        : `${API_URL}/locations`;
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save location');
      }

      closeLocationModal();
      showSuccess(editingLocation ? 'Location updated successfully' : 'Location added successfully');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return;
    }

    setError('');
    try {
      const response = await apiFetch(`${API_URL}/locations/${locationId}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      showSuccess('Location deleted successfully');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyRequest = async (requestId) => {
    try {
      const response = await apiFetch(`${API_URL}/requests`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'fulfilled', Id: requestId}),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to verify request');
      }

      fetchData();
    } catch (err) {
      console.error('Error verifying request:', err);
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const renderResourceModal = () => {
    if (!showResourceModal) return null;

    return (
      <div className="modal-overlay" onClick={closeResourceModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{editingResource ? 'Edit Resource' : 'Add Resource'}</h3>
          <form onSubmit={handleResourceSubmit}>
            <div className="form-group">
              <label htmlFor="resource-name">Name</label>
              <input
                id="resource-name"
                type="text"
                value={resourceForm.name}
                onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="resource-type">Type</label>
              <select
                id="resource-type"
                value={resourceForm.type}
                onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                required
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="resource-quantity">Quantity</label>
                <input
                  id="resource-quantity"
                  type="number"
                  min="0"
                  value={resourceForm.quantity}
                  onChange={(e) => setResourceForm({ ...resourceForm, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="resource-unit">Unit</label>
                <input
                  id="resource-unit"
                  type="text"
                  placeholder="e.g. kg, liters, boxes"
                  value={resourceForm.unit}
                  onChange={(e) => setResourceForm({ ...resourceForm, unit: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="resource-location">Location</label>
              <select
                id="resource-location"
                value={resourceForm.location_id}
                onChange={(e) => setResourceForm({ ...resourceForm, location_id: e.target.value })}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeResourceModal}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                {editingResource ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderShelterModal = () => {
    if (!showShelterModal) return null;

    return (
      <div className="modal-overlay" onClick={closeShelterModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{editingShelter ? 'Edit Shelter' : 'Add Shelter'}</h3>
          <form onSubmit={handleShelterSubmit}>
            <div className="form-group">
              <label htmlFor="shelter-name">Name</label>
              <input
                id="shelter-name"
                type="text"
                value={shelterForm.name}
                onChange={(e) => setShelterForm({ ...shelterForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="shelter-location">Location</label>
              <select
                id="shelter-location"
                value={shelterForm.location_id}
                onChange={(e) => setShelterForm({ ...shelterForm, location_id: e.target.value })}
                required
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="shelter-capacity">Capacity</label>
                <input
                  id="shelter-capacity"
                  type="number"
                  min="0"
                  value={shelterForm.capacity}
                  onChange={(e) => setShelterForm({ ...shelterForm, capacity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="shelter-occupancy">Current Occupancy</label>
                <input
                  id="shelter-occupancy"
                  type="number"
                  min="0"
                  value={shelterForm.current_occupancy}
                  onChange={(e) => setShelterForm({ ...shelterForm, current_occupancy: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="shelter-contact">Contact Number</label>
              <input
                id="shelter-contact"
                type="text"
                value={shelterForm.contact_number}
                onChange={(e) => setShelterForm({ ...shelterForm, contact_number: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeShelterModal}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                {editingShelter ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderLocationModal = () => {
    if (!showLocationModal) return null;

    return (
      <div className="modal-overlay" onClick={closeLocationModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{editingLocation ? 'Edit Location' : 'Add Location'}</h3>
          <form onSubmit={handleLocationSubmit}>
            <div className="form-group">
              <label htmlFor="location-name">Name</label>
              <input
                id="location-name"
                type="text"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="location-region">Region</label>
              <input
                id="location-region"
                type="text"
                value={locationForm.region}
                onChange={(e) => setLocationForm({ ...locationForm, region: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location-latitude">Latitude</label>
                <input
                  id="location-latitude"
                  type="number"
                  step="any"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="location-longitude">Longitude</label>
                <input
                  id="location-longitude"
                  type="number"
                  step="any"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location-weather">Weather Condition</label>
                <input
                  id="location-weather"
                  type="text"
                  placeholder="e.g. Clear, Rain"
                  value={locationForm.weather_condition}
                  onChange={(e) => setLocationForm({ ...locationForm, weather_condition: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="location-alert">Weather Alert</label>
                <select
                  id="location-alert"
                  value={locationForm.weather_alert}
                  onChange={(e) => setLocationForm({ ...locationForm, weather_alert: e.target.value })}
                >
                  {WEATHER_ALERTS.map((alert) => (
                    <option key={alert} value={alert}>{alert}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeLocationModal}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                {editingLocation ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'resources':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Location</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => (
                <tr key={resource.id}>
                  <td>{resource.id}</td>
                  <td>{resource.name}</td>
                  <td>{resource.type}</td>
                  <td>{resource.quantity}</td>
                  <td>{resource.unit}</td>
                  <td>{resource.location_name}</td>
                  <td>{new Date(resource.last_updated).toLocaleString()}</td>
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => openResourceModal(resource)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteResource(resource.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'shelters':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Current Occupancy</th>
                <th>Contact Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map(shelter => (
                <tr key={shelter.id}>
                  <td>{shelter.id}</td>
                  <td>{shelter.name}</td>
                  <td>{shelter.Location}</td>
                  <td>{shelter.capacity}</td>
                  <td>{shelter.current_occupancy}</td>
                  <td>{shelter.contact_number}</td>
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => openShelterModal(shelter)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteShelter(shelter.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'locations':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Region</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Weather</th>
                <th>Alert</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td>{location.id}</td>
                  <td>{location.name}</td>
                  <td>{location.region || '—'}</td>
                  <td>{location.latitude ?? '—'}</td>
                  <td>{location.longitude ?? '—'}</td>
                  <td>{location.weather_condition || '—'}</td>
                  <td>{location.weather_alert}</td>
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => openLocationModal(location)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'volunteers':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Contact Number</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map(volunteer => (
                <tr key={volunteer.id}>
                  <td>{volunteer.id}</td>
                  <td>{volunteer.username}</td>
                  <td>{volunteer.email}</td>
                  <td>{volunteer.contact_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'requests':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Citizen</th>
                <th>Location</th>
                <th>Resource</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Volunteer</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr key={request.request_id}>
                  <td>{request.request_id}</td>
                  <td>{request.citizen}</td>
                  <td>{request.location}</td>
                  <td>{request.resource}</td>
                  <td>{request.quantity_requested}</td>
                  <td>{request.status}</td>
                  <td>{request.volunteer || 'None'}</td>
                  <td>{request.remarks}</td>
                  <td>
                    {request.status === 'completed' && (
                      <button 
                        onClick={() => handleVerifyRequest(request.request_id)}
                        className="verify-btn"
                      >
                        Verify Completion
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'audit':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.action}</td>
                  <td>{log.performed_by}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'resourceLogs':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Resource ID</th>
                <th>Old Name</th>
                <th>Old Quantity</th>
                <th>New Name</th>
                <th>New Quantity</th>
                <th>Action</th>
                <th>Changed At</th>
              </tr>
            </thead>
            <tbody>
              {resourceLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.resource_id}</td>
                  <td>{log.old_name}</td>
                  <td>{log.old_quantity}</td>
                  <td>{log.new_name}</td>
                  <td>{log.new_quantity}</td>
                  <td>{log.action_type}</td>
                  <td>{new Date(log.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  const tabTitles = {
    resources: 'Resources',
    shelters: 'Shelters',
    locations: 'Locations',
    volunteers: 'Volunteers',
    requests: 'Citizen Requests',
    audit: 'Audit Logs',
    resourceLogs: 'Resource Logs',
  };

  const showAddButton =
    activeTab === 'resources' ||
    activeTab === 'shelters' ||
    activeTab === 'locations';

  const handleAddClick = () => {
    if (activeTab === 'resources') openResourceModal();
    else if (activeTab === 'shelters') openShelterModal();
    else if (activeTab === 'locations') openLocationModal();
  };

  const addButtonLabel = {
    resources: 'Resource',
    shelters: 'Shelter',
    locations: 'Location',
  }[activeTab];

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Disaster Relief Resource Management - Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="admin-content">
        <nav className="admin-sidebar">
          <ul>
            <li 
              className={activeTab === 'resources' ? 'active' : ''}
              onClick={() => setActiveTab('resources')}
            >
              Resources
            </li>
            <li 
              className={activeTab === 'shelters' ? 'active' : ''}
              onClick={() => setActiveTab('shelters')}
            >
              Shelters
            </li>
            <li 
              className={activeTab === 'locations' ? 'active' : ''}
              onClick={() => setActiveTab('locations')}
            >
              Locations
            </li>
            <li 
              className={activeTab === 'volunteers' ? 'active' : ''}
              onClick={() => setActiveTab('volunteers')}
            >
              Volunteers
            </li>
            <li 
              className={activeTab === 'requests' ? 'active' : ''}
              onClick={() => setActiveTab('requests')}
            >
              Citizen Requests
            </li>
            <li 
              className={activeTab === 'audit' ? 'active' : ''}
              onClick={() => setActiveTab('audit')}
            >
              Audit Logs
            </li>
            <li 
              className={activeTab === 'resourceLogs' ? 'active' : ''}
              onClick={() => setActiveTab('resourceLogs')}
            >
              Resource Logs
            </li>
          </ul>
        </nav>

        <main className="admin-main">
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="data-container">
              <div className="section-header">
                <h2>{tabTitles[activeTab] || activeTab}</h2>
                {showAddButton && (
                  <button
                    className="add-btn"
                    onClick={handleAddClick}
                  >
                    + Add {addButtonLabel}
                  </button>
                )}
              </div>
              <div className="table-wrapper">
                {renderTable()}
              </div>
            </div>
          )}
        </main>
      </div>

      {renderResourceModal()}
      {renderShelterModal()}
      {renderLocationModal()}
    </div>
  );
}

export default AdminDashboard;

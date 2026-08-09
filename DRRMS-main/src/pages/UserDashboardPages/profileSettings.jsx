import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL, apiFetch } from '../../config/api';
import '../../styles/profile.css';

const ProfileSettings = () => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();

  // Retrieve userId from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const userId = paramUserId || storedUser?.id; // Fallback to localStorage if no URL param

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    contact_number: '',
  });

  const [editMode, setEditMode] = useState(false); // This state controls if the form is in edit mode
  const [loading, setLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState(null); // To store the initial profile
  const [noChangesMessage, setNoChangesMessage] = useState(''); // State for no changes detected message

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        alert('User ID not found!');
        return;
      }

      try {
        const response = await apiFetch(`${API_URL}/profile/${userId}`);
        const data = await response.json();
        if (response.ok && data.username) {
          setProfile({
            username: data.username,
            email: data.email,
            contact_number: data.contact_number,
          });
          setInitialProfile(data); // Store the initial profile data
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        alert('Failed to load profile.');
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Handle input changes
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Handle save changes
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only proceed if the profile has been modified
    if (
      initialProfile &&
      (profile.username !== initialProfile.username ||
        profile.email !== initialProfile.email ||
        profile.contact_number !== initialProfile.contact_number)
    ) {
      try {
        // Sending the updated profile data to the server
        const response = await apiFetch(`${API_URL}/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
        if (!response.ok) throw new Error('Unable to update profile');
        alert('Profile updated successfully!');
        setEditMode(false); // Exit edit mode after saving changes
        navigate(`/citizen`); // Navigate back to the user dashboard or profile
      } catch (err) {
        console.error('Failed to update profile:', err);
        alert('Failed to update profile. Please try again.');
      }
    } else {
      setNoChangesMessage('No changes detected to update.'); // Set message when no changes are detected
    }
  };

  if (loading) return <div className="profile-container">Loading...</div>;

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <form onSubmit={handleSubmit} className="profile-form">

        <label>
          Username:
          <input
            type="text"
            name="username"
            value={profile.username}
            onChange={handleChange}
            readOnly={!editMode} // If not in edit mode, input is readonly
            required
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            readOnly={!editMode} // If not in edit mode, input is readonly
            required
          />
        </label>
        <label>
          Contact Number:
          <input
            type="text"
            name="contact_number"
            value={profile.contact_number}
            onChange={handleChange}
            readOnly={!editMode} // If not in edit mode, input is readonly
            pattern="[0-9]{10}" // To ensure 10 digit contact number
            required
          />
        </label>

        <div className="btn-group">
          {!editMode ? (
            <button type="button" onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          ) : (
            <>
              <button type="submit">Save Changes</button>
              <button type="button" onClick={() => setEditMode(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Alert, Icon } from "../../components/ui";
import MapView from "../../components/MapView";

// Labels for the fill-level slider
const fillLabel = (v) => {
  const n = Number(v);
  if (n > 90) return "Overflowing";
  if (n > 70) return "Almost full";
  if (n > 40) return "Half full";
  return "Partly full";
};

// 1-3 severity kept in sync with the fill level (older screens use it)
const severityFromFill = (v) => (Number(v) >= 85 ? 3 : Number(v) >= 60 ? 2 : 1);

export default function CreateReport() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    photo: null,
    description: "",
    address: "",
    area: "",
    city: "",
    landmark: "",
    lat: "",
    lng: "",
    fillLevel: 80,
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");

  // Exact-location helpers
  const [accuracy, setAccuracy] = useState(null); // metres, only for GPS fixes
  const [fullAddress, setFullAddress] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const lookupId = useRef(0);

  // The draggable pin follows the latitude / longitude fields
  const picker = useMemo(() => {
    const la = parseFloat(form.lat);
    const ln = parseFloat(form.lng);
    return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180
      ? { lat: la, lng: ln }
      : null;
  }, [form.lat, form.lng]);

  // Show a preview of the chosen photo (presentation only)
  useEffect(() => {
    if (!form.photo) {
      setPhotoPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(form.photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.photo]);

  // -----------------------------------
  // NORMAL INPUT CHANGE
  // -----------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // -----------------------------------
  // PHOTO UPLOAD
  // -----------------------------------
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be less than 5MB.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      photo: file,
    }));

    setError("");
  };

  // -----------------------------------
  // ADDRESS FOR A POINT (street-level)
  // -----------------------------------
  const lookupAddress = async (latitude, longitude) => {
    const id = ++lookupId.current;
    setLocBusy(true);
    setNotice("");

    try {
      const { data } = await api.get("/location/reverse", {
        params: { lat: latitude, lng: longitude },
      });
      if (id !== lookupId.current) return; // a newer pin position won

      setForm((prev) => ({
        ...prev,
        address: data.address || "",
        area: data.area || "",
        city: data.city || "",
        // Landmark stays manually editable and optional
        landmark: prev.landmark,
      }));
      setFullAddress(data.formatted || data.displayName || "");
      setLocationSelected(true);

      if (!data.hasStreet) {
        setNotice(
          "No street name is mapped at this exact point. Move the pin onto a road, or type the street yourself."
        );
      }
    } catch (err) {
      if (id !== lookupId.current) return;
      console.error("Reverse geocoding error:", err);
      setLocationSelected(true);
      setError(
        err.response?.data?.message ||
          "Location selected, but address details could not be found. Please enter them manually."
      );
    } finally {
      if (id === lookupId.current) setLocBusy(false);
    }
  };

  // Put the pin somewhere and fetch its address
  const placePin = (latitude, longitude, gpsAccuracy = null) => {
    setForm((prev) => ({
      ...prev,
      lat: latitude.toFixed(6),
      lng: longitude.toFixed(6),
    }));
    setAccuracy(gpsAccuracy);
    setError("");
    lookupAddress(latitude, longitude);
  };

  // -----------------------------------
  // USE MY CURRENT LOCATION
  // -----------------------------------
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocBusy(true);
    setError("");
    setNotice("");
    setLocationSelected(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        placePin(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      },

      (err) => {
        console.error("Location error:", err);

        if (err.code === 1) {
          setError("Location permission denied. Please allow location access.");
        } else if (err.code === 2) {
          setError("Your current location could not be determined.");
        } else if (err.code === 3) {
          setError("Location request timed out. Please try again.");
        } else {
          setError("Unable to get your current location.");
        }

        setLocBusy(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Map click or pin drag
  const handlePick = ({ lat, lng }) => placePin(lat, lng, null);

  // Address for whatever the latitude / longitude fields currently say
  const fillFromPin = () => {
    if (picker) lookupAddress(picker.lat, picker.lng);
  };

  // -----------------------------------
  // SEARCH A PLACE OR STREET
  // -----------------------------------
  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 3) {
      setNotice("Type at least 3 characters to search.");
      return;
    }
    setSearching(true);
    setNotice("");
    setResults([]);
    try {
      const { data } = await api.get("/location/search", { params: { q } });
      setResults(data.results);
      if (data.results.length === 0) setNotice("No places found. Try a more specific name.");
    } catch (err) {
      setNotice(err.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const chooseResult = (r) => {
    lookupId.current += 1; // cancel any pending lookup
    setForm((prev) => ({
      ...prev,
      address: r.address || "",
      area: r.area || "",
      city: r.city || "",
      lat: r.latitude.toFixed(6),
      lng: r.longitude.toFixed(6),
    }));
    setFullAddress(r.formatted || r.displayName || "");
    setAccuracy(null);
    setLocationSelected(true);
    setLocBusy(false);
    setResults([]);
    setQuery("");
    setError("");
    setNotice(r.hasStreet ? "" : "This place has no street name on the map. Add the street yourself if you know it.");
  };

  // -----------------------------------
  // SUBMIT REPORT
  // -----------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // Description
    if (!form.description.trim()) {
      setError("Please enter the description.");
      return;
    }

    // Address
    if (!form.address.trim()) {
      setError("Please enter the address.");
      return;
    }

    // Area
    if (!form.area.trim()) {
      setError("Please enter the area.");
      return;
    }

    // City
    if (!form.city.trim()) {
      setError("Please enter the city.");
      return;
    }

    // Fill level
    const fill = Number(form.fillLevel);
    if (Number.isNaN(fill) || fill < 0 || fill > 100) {
      setError("Fill level must be between 0 and 100.");
      return;
    }

    // Latitude
    if (!form.lat) {
      setError(
        "Please enter latitude or use your current location."
      );
      return;
    }

    // Longitude
    if (!form.lng) {
      setError(
        "Please enter longitude or use your current location."
      );
      return;
    }

    const latitude = Number(form.lat);
    const longitude = Number(form.lng);

    // Validate latitude
    if (
      Number.isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setError(
        "Latitude must be between -90 and 90."
      );
      return;
    }

    // Validate longitude
    if (
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        "Longitude must be between -180 and 180."
      );
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();

      // -----------------------------------
      // PHOTO
      // -----------------------------------
      if (form.photo) {
        formData.append("photo", form.photo);
      }

      // -----------------------------------
      // DESCRIPTION
      // -----------------------------------
      formData.append(
        "description",
        form.description.trim()
      );

      // -----------------------------------
      // LOCATION
      // -----------------------------------
      formData.append(
        "location",
        JSON.stringify({
          address: form.address.trim(),
          area: form.area.trim(),
          city: form.city.trim(),
          landmark: form.landmark.trim(),
          lat: latitude,
          lng: longitude,
        })
      );

      // -----------------------------------
      // FILL LEVEL (+ matching 1-3 severity)
      // -----------------------------------
      formData.append("fillLevel", String(fill));
      formData.append("severity", String(severityFromFill(fill)));

      // -----------------------------------
      // SEND TO BACKEND
      // -----------------------------------
      await api.post("/reports", formData);

      // -----------------------------------
      // SUCCESS
      // -----------------------------------
      navigate("/citizen/my-reports");
    } catch (err) {
      console.error(
        "Submit report error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to submit report. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // -----------------------------------
  // PAGE
  // -----------------------------------
  return (
    <div className="page form-page">
      <header className="page-header">
        <div className="page-header-text">
          <h1>New Report</h1>
          <p>A clear photo and an exact location help collection staff reach the bin faster.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        {error && <Alert type="error">{error}</Alert>}

        {/* 1. PHOTO */}
        <section className="form-section">
          <h2>Photo</h2>
          <p className="section-desc">Optional. Images up to 5 MB.</p>

          <label
            htmlFor="photo"
            className={`dropzone${photoPreview ? " has-photo" : ""}`}
          >
            {photoPreview ? (
              <>
                <img className="dz-preview" src={photoPreview} alt="Selected waste photo preview" />
                <span className="dz-change">Change photo</span>
              </>
            ) : (
              <>
                <span className="dz-icon"><Icon name="camera" size={24} /></span>
                <strong>Click to upload a photo</strong>
                <small>PNG, JPG or WEBP</small>
              </>
            )}
            <input
              id="photo"
              type="file"
              name="photo"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </label>

          {form.photo && (
            <div className="photo-selected">
              <Icon name="checkCircle" size={16} />
              Selected: {form.photo.name}
            </div>
          )}
        </section>

        {/* 2. DESCRIPTION + FILL LEVEL */}
        <section className="form-section">
          <h2>What is happening?</h2>
          <p className="section-desc">Describe the problem and how full the bin is.</p>

          <div className="field">
            <label htmlFor="description">Description<span className="req">*</span></label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the overflowing bin or waste problem"
              required
            />
          </div>

          <div className="field">
            <div className="fill-head">
              <label htmlFor="fillLevel">Bin fill level</label>
              <span className="fill-value" data-level={severityFromFill(form.fillLevel)}>
                {form.fillLevel}% · {fillLabel(form.fillLevel)}
              </span>
            </div>
            <input
              id="fillLevel"
              className="fill-range"
              type="range"
              name="fillLevel"
              min="10"
              max="100"
              step="5"
              value={form.fillLevel}
              onChange={handleChange}
              style={{ "--fill": `${((form.fillLevel - 10) / 90) * 100}%` }}
            />
            <div className="fill-scale" aria-hidden="true">
              <span>Partly full</span>
              <span>Half full</span>
              <span>Almost full</span>
              <span>Overflowing</span>
            </div>
          </div>
        </section>

        {/* 3. LOCATION */}
        <section className="form-section">
          <h2>Location</h2>
          <p className="section-desc">
            Use your location, search for a place, or drop the pin on the exact bin.
          </p>

          <div className="locate-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={useMyLocation}
              disabled={locBusy}
            >
              <Icon name="locate" size={18} />
              {locBusy ? "Finding address..." : "Use My Location"}
            </button>

            <div className="place-search">
              <Icon name="search" size={18} className="place-search-icon" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Search a street or place"
                aria-label="Search a street or place"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={runSearch} disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <ul className="search-results">
              {results.map((r, i) => (
                <li key={`${r.latitude}-${r.longitude}-${i}`}>
                  <button type="button" onClick={() => chooseResult(r)}>
                    <Icon name="pin" size={16} />
                    <span>{r.formatted || r.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {notice && <Alert type="info">{notice}</Alert>}

          {accuracy !== null && accuracy > 100 && (
            <Alert type="info">
              Your device gave an approximate location (about {Math.round(accuracy)} m off). Drag the
              pin on the map to the exact bin so staff can find it.
            </Alert>
          )}

          <div className="picker-map">
            <MapView picker={picker} onPick={handlePick} height={320} autoFit={false} />
            <p className="hint">
              {picker
                ? "Drag the pin or click the map to adjust the exact spot. The address updates automatically."
                : "Click the map to drop a pin on the bin."}
            </p>
          </div>

          {locationSelected && (
            <div className="location-success">
              <div className="loc-head">
                <Icon name="checkCircle" size={18} />
                Location selected
                {accuracy !== null && <span className="loc-acc">GPS accuracy ~{Math.round(accuracy)} m</span>}
              </div>
              {fullAddress && <p className="loc-full">{fullAddress}</p>}
              <dl>
                <div><dt>Street / address</dt><dd>{form.address || "Not found"}</dd></div>
                <div><dt>Area</dt><dd>{form.area || "Not found"}</dd></div>
                <div><dt>City</dt><dd>{form.city || "Not found"}</dd></div>
                <div><dt>Latitude</dt><dd>{form.lat}</dd></div>
                <div><dt>Longitude</dt><dd>{form.lng}</dd></div>
              </dl>
            </div>
          )}

          <div className="field">
            <label htmlFor="address">Address<span className="req">*</span></label>
            <input
              id="address"
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Door number, street name"
              required
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="area">Area<span className="req">*</span></label>
              <input
                id="area"
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="Enter area / locality"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="city">City<span className="req">*</span></label>
              <input
                id="city"
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Enter city"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="landmark">
              Landmark <span className="optional">(Optional)</span>
            </label>
            <input
              id="landmark"
              type="text"
              name="landmark"
              value={form.landmark}
              onChange={handleChange}
              placeholder="Enter nearby landmark (hospital, school, bus stop...)"
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="lat">Latitude<span className="req">*</span></label>
              <input
                id="lat"
                type="number"
                name="lat"
                step="any"
                value={form.lat}
                onChange={handleChange}
                placeholder="Enter latitude"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="lng">Longitude<span className="req">*</span></label>
              <input
                id="lng"
                type="number"
                name="lng"
                step="any"
                value={form.lng}
                onChange={handleChange}
                placeholder="Enter longitude"
                required
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fillFromPin}
            disabled={!picker || locBusy}
          >
            <Icon name="pin" size={16} />
            Fill the address from these coordinates
          </button>
        </section>

        {/* SUBMIT */}
        <div className="form-actions">
          <p className="hint"><span className="req">*</span> Required fields</p>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

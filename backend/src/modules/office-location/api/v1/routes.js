import { Router } from 'express';
import { dbAll, dbRun, dbGet } from '#@/core/database';
import { authenticateToken, requirePermission } from '#@/core/middleware/auth';

const router = Router();

// 1. GET /api/v1/office-locations - List locations
router.get('/', authenticateToken, requirePermission('org:read'), async (req, res) => {
  try {
    const locations = await dbAll('SELECT * FROM office_locations ORDER BY id ASC');
    res.status(200).json({ locations });
  } catch (err) {
    res.status(500).json({ error: 'Database query failed: ' + err.message });
  }
});

// 2. POST /api/v1/office-locations - Create location
router.post('/', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { name, address, geoLat, geoLng, geoRadiusMeters } = req.body;

  if (!name || !address || geoLat === undefined || geoLng === undefined) {
    return res.status(400).json({ error: 'Name, address, geoLat, and geoLng parameters are required.' });
  }

  const radius = geoRadiusMeters !== undefined ? parseFloat(geoRadiusMeters) : 100;

  try {
    const result = await dbRun(
      'INSERT INTO office_locations (name, address, geo_lat, geo_lng, geo_radius_meters) VALUES (?, ?, ?, ?, ?)',
      [name, address, parseFloat(geoLat), parseFloat(geoLng), radius]
    );

    res.status(201).json({
      message: 'Office location created successfully.',
      location: { id: result.id, name, address, geo_lat: parseFloat(geoLat), geo_lng: parseFloat(geoLng), geo_radius_meters: radius }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create office location: ' + err.message });
  }
});

// 3. PUT /api/v1/office-locations/:id - Edit location
router.put('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;
  const { name, address, geoLat, geoLng, geoRadiusMeters } = req.body;

  if (!name || !address || geoLat === undefined || geoLng === undefined) {
    return res.status(400).json({ error: 'Name, address, geoLat, and geoLng parameters are required.' });
  }

  const radius = geoRadiusMeters !== undefined ? parseFloat(geoRadiusMeters) : 100;

  try {
    const existing = await dbGet('SELECT id FROM office_locations WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Office location not found.' });
    }

    await dbRun(
      'UPDATE office_locations SET name = ?, address = ?, geo_lat = ?, geo_lng = ?, geo_radius_meters = ? WHERE id = ?',
      [name, address, parseFloat(geoLat), parseFloat(geoLng), radius, id]
    );

    res.status(200).json({
      message: 'Office location updated successfully.',
      location: { id: parseInt(id), name, address, geo_lat: parseFloat(geoLat), geo_lng: parseFloat(geoLng), geo_radius_meters: radius }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update office location: ' + err.message });
  }
});

// 4. DELETE /api/v1/office-locations/:id - Delete location
router.delete('/:id', authenticateToken, requirePermission('org:write'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await dbGet('SELECT id FROM office_locations WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Office location not found.' });
    }

    await dbRun('DELETE FROM office_locations WHERE id = ?', [id]);
    res.status(200).json({ message: 'Office location deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete office location: ' + err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { sensorDataService } from '../services/sensor-data.service';

const router = Router();

/**
 * GET /api/stats
 * Returns overall statistics: active sensor count & messages per minute
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = sensorDataService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/sensors
 * Returns all sensors with their average temperatures
 */
router.get('/sensors', (_req: Request, res: Response) => {
  try {
    const sensors = sensorDataService.getAllSensors();
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

/**
 * GET /api/sensors/:id
 * Returns details for a specific sensor including recent readings
 */
router.get('/sensors/:id', (req: Request, res: Response) => {
  try {
    const sensorId = parseInt(req.params.id as string, 10);

    if (isNaN(sensorId) || sensorId < 0 || sensorId > 63) {
      res.status(400).json({ error: 'Invalid sensor ID. Must be between 0 and 63.' });
      return;
    }

    const sensor = sensorDataService.getSensor(sensorId);

    if (!sensor) {
      res.status(404).json({ error: `Sensor ${sensorId} not found` });
      return;
    }

    res.json(sensor);
  } catch (error) {
    console.error('Error fetching sensor:', error);
    res.status(500).json({ error: 'Failed to fetch sensor details' });
  }
});

export default router;

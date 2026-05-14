import { Request, Response, Router } from 'express';

const router = Router();
const MAPS_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// ── Built-in Location Database (fallback when Google API is unavailable) ─────
// Real coordinates for popular hospitals, landmarks, and areas in India
const LOCAL_PLACES: { id: string; description: string; lat: number; lng: number }[] = [
  // ── Bengaluru Hospitals ──
  { id: 'local_1',  description: 'Apollo Hospital, Bannerghatta Road, Bengaluru, Karnataka, India',       lat: 12.8917, lng: 77.5971 },
  { id: 'local_2',  description: 'Apollo Hospital, Seshadripuram, Bengaluru, Karnataka, India',            lat: 12.9924, lng: 77.5737 },
  { id: 'local_3',  description: 'Manipal Hospital, Old Airport Road, Bengaluru, Karnataka, India',        lat: 12.9615, lng: 77.6474 },
  { id: 'local_4',  description: 'Manipal Hospital, Sarjapur Road, Bengaluru, Karnataka, India',           lat: 12.9102, lng: 77.6854 },
  { id: 'local_5',  description: 'Fortis Hospital, Bannerghatta Road, Bengaluru, Karnataka, India',        lat: 12.8888, lng: 77.5972 },
  { id: 'local_6',  description: 'Fortis Hospital, Cunningham Road, Bengaluru, Karnataka, India',          lat: 12.9851, lng: 77.5874 },
  { id: 'local_7',  description: 'Narayana Health City, Bommasandra, Bengaluru, Karnataka, India',          lat: 12.8097, lng: 77.6876 },
  { id: 'local_8',  description: 'Columbia Asia Hospital, Hebbal, Bengaluru, Karnataka, India',             lat: 13.0358, lng: 77.5970 },
  { id: 'local_9',  description: 'Columbia Asia Hospital, Whitefield, Bengaluru, Karnataka, India',         lat: 12.9698, lng: 77.7500 },
  { id: 'local_10', description: 'Sakra World Hospital, Bellandur, Bengaluru, Karnataka, India',            lat: 12.9294, lng: 77.6782 },
  { id: 'local_11', description: 'BGS Gleneagles Global Hospital, Kengeri, Bengaluru, Karnataka, India',    lat: 12.9075, lng: 77.4879 },
  { id: 'local_12', description: 'Aster CMI Hospital, Hebbal, Bengaluru, Karnataka, India',                 lat: 13.0370, lng: 77.5930 },
  { id: 'local_13', description: 'MS Ramaiah Memorial Hospital, MSRIT Post, Bengaluru, Karnataka, India',   lat: 13.0304, lng: 77.5648 },
  { id: 'local_14', description: 'Sparsh Hospital, Infantry Road, Bengaluru, Karnataka, India',             lat: 12.9821, lng: 77.6024 },
  { id: 'local_15', description: 'Vikram Hospital, Millers Road, Bengaluru, Karnataka, India',              lat: 12.9934, lng: 77.5885 },
  { id: 'local_16', description: 'St. John\'s Medical College Hospital, Koramangala, Bengaluru, India',     lat: 12.9310, lng: 77.6198 },
  { id: 'local_17', description: 'Bangalore Baptist Hospital, Hebbal, Bengaluru, Karnataka, India',         lat: 13.0279, lng: 77.5908 },
  { id: 'local_18', description: 'Sagar Hospitals, Kumaraswamy Layout, Bengaluru, Karnataka, India',        lat: 12.9049, lng: 77.5633 },
  { id: 'local_19', description: 'NIMHANS, Hosur Road, Bengaluru, Karnataka, India',                        lat: 12.9425, lng: 77.5970 },
  { id: 'local_20', description: 'Bowring & Lady Curzon Hospital, Shivajinagar, Bengaluru, India',          lat: 12.9849, lng: 77.6074 },
  { id: 'local_21', description: 'Victoria Hospital, K.R. Market, Bengaluru, Karnataka, India',             lat: 12.9594, lng: 77.5739 },
  { id: 'local_22', description: 'Jayadeva Institute of Cardiology, Bannerghatta Road, Bengaluru, India',   lat: 12.9157, lng: 77.5990 },
  { id: 'local_23', description: 'Kidwai Memorial Institute of Oncology, Bengaluru, Karnataka, India',      lat: 12.9360, lng: 77.5790 },

  // ── Bengaluru Landmarks & Areas ──
  { id: 'local_30', description: 'Majestic (Kempegowda Bus Station), Bengaluru, Karnataka, India',          lat: 12.9772, lng: 77.5716 },
  { id: 'local_31', description: 'MG Road (Mahatma Gandhi Road), Bengaluru, Karnataka, India',              lat: 12.9756, lng: 77.6069 },
  { id: 'local_32', description: 'Koramangala, Bengaluru, Karnataka, India',                                lat: 12.9352, lng: 77.6244 },
  { id: 'local_33', description: 'Indiranagar, Bengaluru, Karnataka, India',                                lat: 12.9719, lng: 77.6412 },
  { id: 'local_34', description: 'Whitefield, Bengaluru, Karnataka, India',                                 lat: 12.9698, lng: 77.7500 },
  { id: 'local_35', description: 'Electronic City, Bengaluru, Karnataka, India',                            lat: 12.8399, lng: 77.6770 },
  { id: 'local_36', description: 'Jayanagar, Bengaluru, Karnataka, India',                                  lat: 12.9250, lng: 77.5938 },
  { id: 'local_37', description: 'JP Nagar, Bengaluru, Karnataka, India',                                   lat: 12.9063, lng: 77.5857 },
  { id: 'local_38', description: 'HSR Layout, Bengaluru, Karnataka, India',                                 lat: 12.9116, lng: 77.6474 },
  { id: 'local_39', description: 'BTM Layout, Bengaluru, Karnataka, India',                                 lat: 12.9166, lng: 77.6101 },
  { id: 'local_40', description: 'Rajajinagar, Bengaluru, Karnataka, India',                                lat: 12.9910, lng: 77.5530 },
  { id: 'local_41', description: 'Malleshwaram, Bengaluru, Karnataka, India',                               lat: 13.0035, lng: 77.5687 },
  { id: 'local_42', description: 'Basavanagudi, Bengaluru, Karnataka, India',                               lat: 12.9425, lng: 77.5745 },
  { id: 'local_43', description: 'Yelahanka, Bengaluru, Karnataka, India',                                  lat: 13.1007, lng: 77.5964 },
  { id: 'local_44', description: 'Hebbal, Bengaluru, Karnataka, India',                                     lat: 13.0350, lng: 77.5970 },
  { id: 'local_45', description: 'Banashankari, Bengaluru, Karnataka, India',                               lat: 12.9255, lng: 77.5468 },
  { id: 'local_46', description: 'Marathahalli, Bengaluru, Karnataka, India',                               lat: 12.9591, lng: 77.7009 },
  { id: 'local_47', description: 'Sarjapur Road, Bengaluru, Karnataka, India',                              lat: 12.9100, lng: 77.6855 },
  { id: 'local_48', description: 'Bellandur, Bengaluru, Karnataka, India',                                  lat: 12.9260, lng: 77.6762 },

  // ── Bengaluru Universities ──
  { id: 'local_50', description: 'REVA University, Kattigenahalli, Yelahanka, Bengaluru, Karnataka, India',  lat: 13.1169, lng: 77.6340 },
  { id: 'local_51', description: 'Christ University, Hosur Road, Bengaluru, Karnataka, India',               lat: 12.9360, lng: 77.6066 },
  { id: 'local_52', description: 'Bangalore University, Jnana Bharathi Campus, Bengaluru, India',            lat: 12.9414, lng: 77.5082 },
  { id: 'local_53', description: 'PES University, Banashankari, Bengaluru, Karnataka, India',                lat: 12.9344, lng: 77.5363 },
  { id: 'local_54', description: 'RV College of Engineering, Mysore Road, Bengaluru, Karnataka, India',      lat: 12.9236, lng: 77.4987 },
  { id: 'local_55', description: 'MS Ramaiah Institute of Technology, Bengaluru, Karnataka, India',           lat: 13.0294, lng: 77.5648 },

  // ── Other Major Indian Cities - Hospitals ──
  { id: 'local_60', description: 'Apollo Hospital, Greams Road, Chennai, Tamil Nadu, India',                  lat: 13.0614, lng: 80.2527 },
  { id: 'local_61', description: 'Apollo Hospital, Jubilee Hills, Hyderabad, Telangana, India',               lat: 17.4116, lng: 78.4105 },
  { id: 'local_62', description: 'Fortis Hospital, Shalimar Bagh, New Delhi, India',                          lat: 28.7160, lng: 77.1568 },
  { id: 'local_63', description: 'Fortis Hospital, Mulund, Mumbai, Maharashtra, India',                       lat: 19.1763, lng: 72.9568 },
  { id: 'local_64', description: 'AIIMS, Ansari Nagar, New Delhi, India',                                     lat: 28.5672, lng: 77.2100 },
  { id: 'local_65', description: 'Manipal Hospital, Dwarka, New Delhi, India',                                lat: 28.5807, lng: 77.0424 },
  { id: 'local_66', description: 'Max Super Speciality Hospital, Saket, New Delhi, India',                    lat: 28.5274, lng: 77.2135 },
  { id: 'local_67', description: 'Medanta - The Medicity, Sector 38, Gurugram, Haryana, India',               lat: 28.4400, lng: 77.0426 },
  { id: 'local_68', description: 'Kokilaben Dhirubhai Ambani Hospital, Andheri, Mumbai, India',               lat: 19.1312, lng: 72.8275 },
  { id: 'local_69', description: 'Lilavati Hospital, Bandra, Mumbai, Maharashtra, India',                     lat: 19.0509, lng: 72.8294 },
  { id: 'local_70', description: 'Tata Memorial Hospital, Parel, Mumbai, Maharashtra, India',                 lat: 19.0048, lng: 72.8422 },
  { id: 'local_71', description: 'CMC Vellore, Vellore, Tamil Nadu, India',                                   lat: 12.9228, lng: 79.1365 },
  { id: 'local_72', description: 'Amrita Hospital, Kochi, Kerala, India',                                     lat: 10.0725, lng: 76.3505 },
  { id: 'local_73', description: 'KMC Hospital, Mangalore, Karnataka, India',                                 lat: 12.8717, lng: 74.8422 },
  { id: 'local_74', description: 'JSS Hospital, Mysore, Karnataka, India',                                    lat: 12.3155, lng: 76.6480 },
  { id: 'local_75', description: 'SDM College of Medical Sciences, Dharwad, Karnataka, India',                lat: 15.4254, lng: 74.9918 },

  // ── Other Major Indian Cities - Landmarks ──
  { id: 'local_80', description: 'Connaught Place, New Delhi, India',                                         lat: 28.6315, lng: 77.2167 },
  { id: 'local_81', description: 'Gateway of India, Mumbai, Maharashtra, India',                              lat: 18.9220, lng: 72.8347 },
  { id: 'local_82', description: 'Marina Beach, Chennai, Tamil Nadu, India',                                  lat: 13.0499, lng: 80.2824 },
  { id: 'local_83', description: 'Charminar, Hyderabad, Telangana, India',                                    lat: 17.3616, lng: 78.4747 },
  { id: 'local_84', description: 'Mysore Palace, Mysore, Karnataka, India',                                   lat: 12.3052, lng: 76.6551 },
];

// Fuzzy search: matches if all words in the query appear anywhere in the description
function searchLocalPlaces(query: string): typeof LOCAL_PLACES {
  const words = query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  return LOCAL_PLACES.filter(place => {
    const desc = place.description.toLowerCase();
    return words.every(word => desc.includes(word));
  }).slice(0, 8); // Max 8 results
}

// ── Places Autocomplete Proxy ────────────────────────────────────────────────
// Tries Google API first, falls back to local database if API fails
router.get('/autocomplete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { input } = req.query;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ predictions: [], status: 'INVALID_REQUEST' });
      return;
    }

    // 1. Try Google Places API first
    if (MAPS_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&language=en&key=${MAPS_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.predictions?.length > 0) {
          res.json({
            predictions: data.predictions.map((p: any) => ({
              place_id: p.place_id,
              description: p.description,
            })),
            status: 'OK',
            source: 'google',
          });
          return;
        }

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.warn('[PlacesProxy] Google API issue:', data.status, data.error_message, '— falling back to local DB');
        }
      } catch (err) {
        console.warn('[PlacesProxy] Google API fetch failed — falling back to local DB');
      }
    }

    // 2. Fallback: search local database
    const localResults = searchLocalPlaces(input);

    if (localResults.length > 0) {
      res.json({
        predictions: localResults.map(p => ({
          place_id: p.id,
          description: p.description,
        })),
        status: 'OK',
        source: 'local',
      });
    } else {
      res.json({
        predictions: [],
        status: 'ZERO_RESULTS',
        source: 'local',
      });
    }
  } catch (error: any) {
    console.error('[PlacesProxy] autocomplete error:', error.message);
    res.status(500).json({ predictions: [], status: 'ERROR', error_message: error.message });
  }
});

// ── Place Details Proxy (lat/lng) ────────────────────────────────────────────
// Handles both Google place_ids and local IDs
router.get('/details', async (req: Request, res: Response): Promise<void> => {
  try {
    const { place_id } = req.query;
    if (!place_id || typeof place_id !== 'string') {
      res.status(400).json({ status: 'INVALID_REQUEST' });
      return;
    }

    // Check local database first
    if (place_id.startsWith('local_')) {
      const local = LOCAL_PLACES.find(p => p.id === place_id);
      if (local) {
        res.json({
          status: 'OK',
          lat: local.lat,
          lng: local.lng,
          formatted_address: local.description,
          source: 'local',
        });
        return;
      }
    }

    // Otherwise try Google API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=geometry,formatted_address&key=${MAPS_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[PlacesProxy] Details error:', data.status, data.error_message);
    }

    res.json({
      status: data.status,
      lat: data.result?.geometry?.location?.lat,
      lng: data.result?.geometry?.location?.lng,
      formatted_address: data.result?.formatted_address,
      error_message: data.error_message,
    });
  } catch (error: any) {
    console.error('[PlacesProxy] details error:', error.message);
    res.status(500).json({ status: 'ERROR', error_message: error.message });
  }
});

export default router;

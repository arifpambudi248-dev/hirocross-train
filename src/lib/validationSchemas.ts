import { z } from 'zod';

// Goal validation schema
export const goalSchema = z.object({
  goal_name: z.string().min(2, 'Nama target minimal 2 karakter').max(100, 'Nama target maksimal 100 karakter'),
  goal_type: z.enum(['readiness', 'physical_test', 'training_load', 'competition'], {
    errorMap: () => ({ message: 'Pilih tipe target yang valid' })
  }),
  target_value: z.number().positive('Nilai target harus positif'),
  target_unit: z.string().min(1, 'Satuan harus diisi').max(20, 'Satuan terlalu panjang'),
  current_value: z.number().min(0, 'Nilai saat ini tidak boleh negatif'),
  baseline_value: z.number().min(0, 'Nilai baseline tidak boleh negatif'),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
});

// Training session validation schema
export const trainingSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  session_name: z.string().max(200, 'Nama sesi maksimal 200 karakter').optional(),
  rpe: z.number().int('RPE harus bilangan bulat').min(1, 'RPE minimal 1').max(10, 'RPE maksimal 10'),
  duration_minutes: z.number().int('Durasi harus bilangan bulat').positive('Durasi harus positif').max(600, 'Durasi maksimal 10 jam (600 menit)'),
  load_manual: z.number().positive('Load manual harus positif').max(10000, 'Load manual terlalu besar').nullable(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
});

// Readiness log validation schema
export const readinessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  vj: z.number().positive('Vertical jump harus positif').max(100, 'Vertical jump maksimal 100 cm'),
  rhr: z.number().int('Heart rate harus bilangan bulat').positive('Heart rate harus positif').min(30, 'Heart rate minimal 30 bpm').max(200, 'Heart rate maksimal 200 bpm'),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
});

// Physical test validation schema
export const physicalTestSchema = z.object({
  test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  category: z.enum(['endurance', 'speed', 'strength', 'agility', 'flexibility', 'power'], {
    errorMap: () => ({ message: 'Pilih kategori yang valid' })
  }),
  test_name: z.string().min(2, 'Nama tes minimal 2 karakter').max(100, 'Nama tes maksimal 100 karakter'),
  value: z.number().positive('Nilai tes harus positif').max(10000, 'Nilai tes terlalu besar'),
  unit: z.string().min(1, 'Satuan harus diisi').max(20, 'Satuan terlalu panjang'),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
});

// Template validation schema
export const templateSchema = z.object({
  template_name: z.string().min(2, 'Nama template minimal 2 karakter').max(100, 'Nama template maksimal 100 karakter'),
  session_name: z.string().max(200, 'Nama sesi maksimal 200 karakter').optional(),
  rpe: z.number().int('RPE harus bilangan bulat').min(1, 'RPE minimal 1').max(10, 'RPE maksimal 10'),
  duration_minutes: z.number().int('Durasi harus bilangan bulat').positive('Durasi harus positif').max(600, 'Durasi maksimal 10 jam'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
});

-- Job hiring criteria
ALTER TABLE "jobs" ADD COLUMN "min_age" INTEGER,
ADD COLUMN "max_age" INTEGER,
ADD COLUMN "min_cgpa" DOUBLE PRECISION,
ADD COLUMN "cgpa_scale" INTEGER DEFAULT 4;

-- Institute aliases (for matching free-text institutes)
ALTER TABLE "institute" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Allowed institutes per job
CREATE TABLE "job_allowed_institute" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "institute_id" BIGINT NOT NULL,
    CONSTRAINT "job_allowed_institute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_allowed_institute_job_id_institute_id_key" ON "job_allowed_institute"("job_id", "institute_id");
CREATE INDEX "job_allowed_institute_institute_id_idx" ON "job_allowed_institute"("institute_id");
ALTER TABLE "job_allowed_institute" ADD CONSTRAINT "job_allowed_institute_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_allowed_institute" ADD CONSTRAINT "job_allowed_institute_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Starter institutes (skipped when a same-named institute already exists)
INSERT INTO "institute" ("name", "visible", "aliases")
SELECT v.name, true, v.aliases FROM (VALUES
  ('NED University of Engineering and Technology', ARRAY['NED','NEDUET','NED University','NED Karachi']::text[]),
  ('University of Karachi', ARRAY['Karachi University','KU','Jamia Karachi','Uni of Karachi']::text[]),
  ('FAST National University of Computer and Emerging Sciences', ARRAY['FAST','FAST NUCES','NUCES','FAST University']::text[]),
  ('Institute of Business Administration Karachi', ARRAY['IBA','IBA Karachi']::text[]),
  ('Lahore University of Management Sciences', ARRAY['LUMS']::text[]),
  ('National University of Sciences and Technology', ARRAY['NUST']::text[]),
  ('GIK Institute of Engineering Sciences and Technology', ARRAY['GIKI','GIK Institute']::text[]),
  ('COMSATS University Islamabad', ARRAY['COMSATS','CUI','COMSATS Institute of Information Technology','CIIT']::text[]),
  ('Institute of Space Technology', ARRAY['IST','Institute of Space Technology Islamabad']::text[]),
  ('Dawood University of Engineering and Technology', ARRAY['DUET','Dawood UET']::text[]),
  ('Mehran University of Engineering and Technology', ARRAY['MUET','Mehran University']::text[]),
  ('University of Engineering and Technology Lahore', ARRAY['UET Lahore','UET']::text[]),
  ('University of Engineering and Technology Peshawar', ARRAY['UET Peshawar']::text[]),
  ('Sir Syed University of Engineering and Technology', ARRAY['SSUET','Sir Syed University']::text[]),
  ('Hamdard University', ARRAY[]::text[]),
  ('Iqra University', ARRAY[]::text[]),
  ('Bahria University', ARRAY[]::text[]),
  ('Air University', ARRAY[]::text[]),
  ('Aga Khan University', ARRAY['AKU']::text[]),
  ('Habib University', ARRAY[]::text[]),
  ('Institute of Business Management', ARRAY['IoBM','IOBM']::text[]),
  ('Szabist', ARRAY['SZABIST','Shaheed Zulfikar Ali Bhutto Institute of Science and Technology']::text[]),
  ('University of the Punjab', ARRAY['Punjab University','PU Lahore']::text[]),
  ('Quaid-i-Azam University', ARRAY['QAU','Quaid e Azam University']::text[]),
  ('University of Sindh', ARRAY['Sindh University','Jamshoro University']::text[]),
  ('Karachi Institute of Economics and Technology', ARRAY['KIET']::text[])
) AS v(name, aliases)
WHERE NOT EXISTS (SELECT 1 FROM "institute" i WHERE lower(i.name) = lower(v.name));

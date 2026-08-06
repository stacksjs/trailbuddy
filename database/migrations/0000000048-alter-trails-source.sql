ALTER TABLE "trails" ADD COLUMN "source" TEXT CHECK ("source" IN ('osm', 'usfs', 'nps', 'manual')) default 'manual';

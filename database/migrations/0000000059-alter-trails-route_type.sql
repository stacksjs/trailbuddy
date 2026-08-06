ALTER TABLE "trails" ADD COLUMN "route_type" TEXT CHECK ("route_type" IN ('loop', 'out-and-back', 'point-to-point', 'network'));

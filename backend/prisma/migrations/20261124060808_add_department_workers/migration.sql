-- CreateTable
CREATE TABLE "department_workers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "crew_id" UUID,
    "employee_code" VARCHAR(30) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "position" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_workers_employee_code_key" ON "department_workers"("employee_code");

-- CreateIndex
CREATE INDEX "idx_department_workers_dept_crew" ON "department_workers"("department_id", "crew_id");

-- AddForeignKey
ALTER TABLE "department_workers" ADD CONSTRAINT "department_workers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_workers" ADD CONSTRAINT "department_workers_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "field_crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

// apps/backend/src/bin/seed.rs
use sqlx::postgres::PgPoolOptions;
use sqlx::Row;
use std::env;
use uuid::Uuid;
use chrono::NaiveDate;


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    println!("🌱 Seeding database with rich demo data at {}...", database_url);

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    // 1. Remove former data (Truncate)
    println!("🧹 Truncating tables...");
    sqlx::query(
        "TRUNCATE TABLE alerts, audit_logs, field_logs, project_messages, media, tasks, phases, \
         project_partners, project_impact_metrics, projects, users, partners, \
         global_metric_templates, countries, webhook_delivery_queue CASCADE;"
    )
    .execute(&pool)
    .await?;

    // 2. Hash Password
    let password_hash = bcrypt::hash("password123", 12)?;

    // 3. Insert Countries
    println!("🌍 Seeding countries...");
    let ethiopia_boundaries = serde_json::json!({
      "Oromia": {
        "East Shewa": {
          "Ada'a": ["Kebele 01", "Kebele 02", "Kebele 03"],
          "Lome": ["Lome Kebele A", "Lome Kebele B"]
        },
        "Arsi": {
          "Munesa": ["Munesa Kebele 1", "Munesa Kebele 2"],
          "Shirka": ["Shirka Kebele 1", "Shirka Kebele 2"]
        }
      },
      "Amhara": {
        "North Gondar": {
          "Debarq": ["Debarq Kebele 1", "Debarq Kebele 2"],
          "Lay Armachiho": ["Lay Armachiho Kebele 1", "Lay Armachiho Kebele 2"]
        },
        "South Wollo": {
          "Dessie Zuria": ["Dessie Zuria Kebele 1", "Dessie Zuria Kebele 2"],
          "Kalu": ["Kalu Kebele 1", "Kalu Kebele 2"]
        }
      },
      "Tigray": {
        "Eastern Tigray": {
          "Adigrat Zuria": ["Adigrat Zuria Kebele 1", "Adigrat Zuria Kebele 2"],
          "Ganta Afeshum": ["Ganta Afeshum Kebele 1", "Ganta Afeshum Kebele 2"]
        },
        "Southern Tigray": {
          "Alaje": ["Alaje Kebele 1", "Alaje Kebele 2"],
          "Endamehoni": ["Endamehoni Kebele 1", "Endamehoni Kebele 2"]
        }
      }
    });

    let ghana_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")?;
    let namibia_id = Uuid::parse_str("00000000-0000-0000-0000-000000000002")?;
    let ethiopia_id = Uuid::parse_str("00000000-0000-0000-0000-000000000003")?;
    let uganda_id = Uuid::parse_str("00000000-0000-0000-0000-000000000004")?;
    let kenya_id = Uuid::parse_str("00000000-0000-0000-0000-000000000005")?;

    sqlx::query("INSERT INTO countries (id, name, currency_code, administrative_boundaries) VALUES ($1, $2, $3, $4)")
        .bind(ghana_id).bind("Ghana").bind("GHS").bind(serde_json::Value::Null).execute(&pool).await?;
    sqlx::query("INSERT INTO countries (id, name, currency_code, administrative_boundaries) VALUES ($1, $2, $3, $4)")
        .bind(namibia_id).bind("Namibia").bind("NAD").bind(serde_json::Value::Null).execute(&pool).await?;
    sqlx::query("INSERT INTO countries (id, name, currency_code, administrative_boundaries) VALUES ($1, $2, $3, $4)")
        .bind(ethiopia_id).bind("Ethiopia").bind("ETB").bind(ethiopia_boundaries).execute(&pool).await?;
    sqlx::query("INSERT INTO countries (id, name, currency_code, administrative_boundaries) VALUES ($1, $2, $3, $4)")
        .bind(uganda_id).bind("Uganda").bind("UGX").bind(serde_json::Value::Null).execute(&pool).await?;
    sqlx::query("INSERT INTO countries (id, name, currency_code, administrative_boundaries) VALUES ($1, $2, $3, $4)")
        .bind(kenya_id).bind("Kenya").bind("KES").bind(serde_json::Value::Null).execute(&pool).await?;

    // 4. Seed 5 Users
    println!("👤 Seeding 5 test users...");
    let admin_id = Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000001")?;
    let pm_id = Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000002")?;
    let donor_id = Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000003")?;
    let officer_id = Uuid::parse_str("11111111-0000-0000-0000-000000000001")?;
    let officer2_id = Uuid::parse_str("11111111-0000-0000-0000-000000000002")?;

    sqlx::query("INSERT INTO users (id, country_id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, 'ADMIN'::user_role, $5)")
        .bind(admin_id).bind(ethiopia_id).bind("NGO Admin").bind("admin@ngo.org").bind(&password_hash).execute(&pool).await?;
    sqlx::query("INSERT INTO users (id, country_id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, 'PROJECT_MANAGER'::user_role, $5)")
        .bind(pm_id).bind(ethiopia_id).bind("Project Manager").bind("manager@ngo.org").bind(&password_hash).execute(&pool).await?;
    sqlx::query("INSERT INTO users (id, country_id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, 'DONOR'::user_role, $5)")
        .bind(donor_id).bind(ethiopia_id).bind("Donor Representative").bind("donor@ngo.org").bind(&password_hash).execute(&pool).await?;
    sqlx::query("INSERT INTO users (id, country_id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, 'FIELD_OFFICER'::user_role, $5)")
        .bind(officer_id).bind(ethiopia_id).bind("Field Officer Ama").bind("officer@ngo.org").bind(&password_hash).execute(&pool).await?;
    sqlx::query("INSERT INTO users (id, country_id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, 'FIELD_OFFICER'::user_role, $5)")
        .bind(officer2_id).bind(ethiopia_id).bind("Field Officer Kojo").bind("officer2@ngo.org").bind(&password_hash).execute(&pool).await?;

    // 5. Seed 5 Partners
    println!("🤝 Seeding 5 partners...");
    let partner1_id = Uuid::parse_str("99999999-0000-0000-0000-000000000001")?;
    let partner2_id = Uuid::parse_str("99999999-0000-0000-0000-000000000002")?;
    let partner3_id = Uuid::parse_str("99999999-0000-0000-0000-000000000003")?;
    let partner4_id = Uuid::parse_str("99999999-0000-0000-0000-000000000004")?;
    let partner5_id = Uuid::parse_str("99999999-0000-0000-0000-000000000005")?;

    sqlx::query("INSERT INTO partners (id, name, type, country_id) VALUES ($1, $2, $3, $4)")
        .bind(partner1_id).bind("Ministry of Water & Energy (Ethiopia)").bind("GOVERNMENT").bind(ethiopia_id).execute(&pool).await?;
    sqlx::query("INSERT INTO partners (id, name, type, country_id) VALUES ($1, $2, $3, $4)")
        .bind(partner2_id).bind("WaterAid East Africa").bind("NGO").bind(ethiopia_id).execute(&pool).await?;
    sqlx::query("INSERT INTO partners (id, name, type, country_id) VALUES ($1, $2, $3, $4)")
        .bind(partner3_id).bind("Helios Foundation").bind("FOUNDATION").bind(ethiopia_id).execute(&pool).await?;
    sqlx::query("INSERT INTO partners (id, name, type, country_id) VALUES ($1, $2, $3, $4)")
        .bind(partner4_id).bind("Safaricom Foundation").bind("FOUNDATION").bind(ethiopia_id).execute(&pool).await?;
    sqlx::query("INSERT INTO partners (id, name, type, country_id) VALUES ($1, $2, $3, $4)")
        .bind(partner5_id).bind("UNICEF WASH Division").bind("GOVERNMENT").bind(ethiopia_id).execute(&pool).await?;

    // 6. Seed Global Metric Templates
    println!("📈 Seeding global metric templates...");
    let templates = vec![
        ("PEOPLE_SERVED", "People Served", "people"),
        ("WELLS_CONSTRUCTED", "Water Wells Constructed", "wells"),
        ("SANITATION_BLOCKS_BUILT", "Sanitation Blocks Built", "blocks"),
        ("WELLS_INSTALLED", "Water Wells Installed", "wells"),
        ("SCHOOLS_CONSTRUCTED", "Schools Constructed", "schools"),
        ("HEALTH_POSTS_CONSTRUCTED", "Health Posts Built", "posts"),
        ("CATARACT_SURGERIES", "Cataract Surgeries Completed", "surgeries"),
        ("TRAFFICKING_PREVENTED", "Trafficking Prevention Audiences Reach", "people"),
    ];

    let mut template_ids = std::collections::HashMap::new();
    for (code, display_name, unit) in templates {
        let row = sqlx::query(
            "INSERT INTO global_metric_templates (code, display_name, unit) VALUES ($1, $2, $3) \
             ON CONFLICT (code) DO UPDATE SET display_name = EXCLUDED.display_name, unit = EXCLUDED.unit \
             RETURNING id"
        )
        .bind(code)
        .bind(display_name)
        .bind(unit)
        .fetch_one(&pool)
        .await?;
        
        let id: Uuid = row.get("id");
        template_ids.insert(code.to_string(), id);
    }

    // 7. Seed 5 Projects
    println!("📁 Seeding 5 projects...");
    let proj1_id = Uuid::parse_str("22222222-2222-2222-2222-000000000001")?;
    let proj2_id = Uuid::parse_str("22222222-2222-2222-2222-000000000002")?;
    let proj3_id = Uuid::parse_str("22222222-2222-2222-2222-000000000003")?;
    let proj4_id = Uuid::parse_str("22222222-2222-2222-2222-000000000004")?;
    let proj5_id = Uuid::parse_str("22222222-2222-2222-2222-000000000005")?;

    // Project 1 (WASH)
    sqlx::query(
        "INSERT INTO projects (id, country_id, name, description, budget_allocated, budget_spent, status, \
         funding_sources, focus_area, location_metadata, start_date, end_date, sector_type, total_income, donor_name) \
         VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS'::project_status, $7, 'WASH'::project_focus_area, $8, $9, $10, $11, $12, $13)"
    )
    .bind(proj1_id)
    .bind(ethiopia_id)
    .bind("East Shewa Borehole Construction")
    .bind("Establishing standard clean community water boreholes with solar purification systems.")
    .bind(120000.00)
    .bind(45000.00)
    .bind(serde_json::json!(["USAID"]))
    .bind(serde_json::json!({
        "region": "Oromia",
        "zone": "East Shewa",
        "woreda": "Ada'a",
        "kebele": "Kebele 01",
        "coordinates": {"lat": 8.9, "lng": 39.0}
    }))
    .bind(NaiveDate::from_ymd_opt(2026, 1, 15))
    .bind(NaiveDate::from_ymd_opt(2026, 8, 30))
    .bind("Water System")
    .bind(150000.00)
    .bind("USAID")
    .execute(&pool)
    .await?;

    // Project 2 (HEALTH)
    sqlx::query(
        "INSERT INTO projects (id, country_id, name, description, budget_allocated, budget_spent, status, \
         funding_sources, focus_area, location_metadata, start_date, end_date, sector_type, total_income, donor_name) \
         VALUES ($1, $2, $3, $4, $5, $6, 'PLANNING'::project_status, $7, 'HEALTH'::project_focus_area, $8, $9, $10, $11, $12, $13)"
    )
    .bind(proj2_id)
    .bind(ethiopia_id)
    .bind("Amhara Rural Clinic Refurbishment")
    .bind("Restoring emergency health clinics and installing basic pediatric care equipment.")
    .bind(80000.00)
    .bind(5000.00)
    .bind(serde_json::json!(["Gates Foundation"]))
    .bind(serde_json::json!({
        "region": "Amhara",
        "zone": "North Gondar",
        "woreda": "Debarq",
        "kebele": "Debarq Kebele 1",
        "coordinates": {"lat": 13.15, "lng": 37.9}
    }))
    .bind(NaiveDate::from_ymd_opt(2026, 6, 1))
    .bind(NaiveDate::from_ymd_opt(2026, 12, 15))
    .bind("Clinic")
    .bind(90000.00)
    .bind("Gates Foundation")
    .execute(&pool)
    .await?;

    // Project 3 (EDUCATION)
    sqlx::query(
        "INSERT INTO projects (id, country_id, name, description, budget_allocated, budget_spent, status, \
         funding_sources, focus_area, location_metadata, start_date, end_date, sector_type, total_income, donor_name) \
         VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED'::project_status, $7, 'EDUCATION'::project_focus_area, $8, $9, $10, $11, $12, $13)"
    )
    .bind(proj3_id)
    .bind(ethiopia_id)
    .bind("Tigray Primary School Sanitation")
    .bind("Constructing sanitation blocks and promoting WASH hygiene practices for primary schools.")
    .bind(65000.00)
    .bind(65000.00)
    .bind(serde_json::json!(["Private Trust"]))
    .bind(serde_json::json!({
        "region": "Tigray",
        "zone": "Eastern Tigray",
        "woreda": "Adigrat Zuria",
        "kebele": "Adigrat Zuria Kebele 1",
        "coordinates": {"lat": 14.25, "lng": 39.45}
    }))
    .bind(NaiveDate::from_ymd_opt(2025, 9, 1))
    .bind(NaiveDate::from_ymd_opt(2026, 5, 20))
    .bind("School")
    .bind(70000.00)
    .bind("Private Trust")
    .execute(&pool)
    .await?;

    // Project 4 (EMPOWERMENT)
    sqlx::query(
        "INSERT INTO projects (id, country_id, name, description, budget_allocated, budget_spent, status, \
         funding_sources, focus_area, location_metadata, start_date, end_date, sector_type, total_income, donor_name) \
         VALUES ($1, $2, $3, $4, $5, $6, 'ON_HOLD'::project_status, $7, 'EMPOWERMENT'::project_focus_area, $8, $9, $10, $11, $12, $13)"
    )
    .bind(proj4_id)
    .bind(ethiopia_id)
    .bind("Oromia Women Vocational Center")
    .bind("Developing modular training spaces for local women to build handicraft and entrepreneurship skills.")
    .bind(45000.00)
    .bind(120000.00) // Trigger alert by spending over allocation
    .bind(serde_json::json!(["Direct Donor"]))
    .bind(serde_json::json!({
        "region": "Oromia",
        "zone": "Arsi",
        "woreda": "Munesa",
        "kebele": "Munesa Kebele 1",
        "coordinates": {"lat": 7.9, "lng": 39.1}
    }))
    .bind(NaiveDate::from_ymd_opt(2026, 3, 10))
    .bind(NaiveDate::from_ymd_opt(2026, 11, 30))
    .bind("Training Center")
    .bind(50000.00)
    .bind("Direct Donor")
    .execute(&pool)
    .await?;

    // Project 5 (WASH Template)
    sqlx::query(
        "INSERT INTO projects (id, country_id, name, description, budget_allocated, budget_spent, status, \
         funding_sources, focus_area, location_metadata, start_date, end_date, sector_type, total_income, donor_name, is_template) \
         VALUES ($1, $2, $3, $4, $5, $6, 'PLANNING'::project_status, $7, 'WASH'::project_focus_area, $8, $9, $10, $11, $12, $13, TRUE)"
    )
    .bind(proj5_id)
    .bind(ethiopia_id)
    .bind("Clean Water Infrastructure Template")
    .bind("Standard blueprint for establishing community boreholes, solar purification systems, and local distribution lines.")
    .bind(200000.00)
    .bind(0.00)
    .bind(serde_json::json!(["Gates Foundation"]))
    .bind(serde_json::json!({
        "region": "Amhara",
        "zone": "South Wollo",
        "woreda": "Kalu",
        "kebele": "Kalu Kebele 1",
        "coordinates": {"lat": 11.0, "lng": 39.8}
    }))
    .bind(NaiveDate::from_ymd_opt(2026, 7, 1))
    .bind(NaiveDate::from_ymd_opt(2026, 9, 30))
    .bind("Water System")
    .bind(200000.00)
    .bind("Gates Foundation")
    .execute(&pool)
    .await?;

    // 8. Seed Project Partners mappings
    println!("🔗 Mapping project partners...");
    sqlx::query("INSERT INTO project_partners (project_id, partner_id, contribution_amount) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(partner1_id).bind(80000.00).execute(&pool).await?;
    sqlx::query("INSERT INTO project_partners (project_id, partner_id, contribution_amount) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(partner2_id).bind(40000.00).execute(&pool).await?;
    sqlx::query("INSERT INTO project_partners (project_id, partner_id, contribution_amount) VALUES ($1, $2, $3)")
        .bind(proj2_id).bind(partner2_id).bind(30000.00).execute(&pool).await?;
    sqlx::query("INSERT INTO project_partners (project_id, partner_id, contribution_amount) VALUES ($1, $2, $3)")
        .bind(proj2_id).bind(partner3_id).bind(50000.00).execute(&pool).await?;
    sqlx::query("INSERT INTO project_partners (project_id, partner_id, contribution_amount) VALUES ($1, $2, $3)")
        .bind(proj3_id).bind(partner4_id).bind(65000.00).execute(&pool).await?;
    sqlx::query("INSERT INTO project_partners (project_id, partner_id, contribution_amount) VALUES ($1, $2, $3)")
        .bind(proj4_id).bind(partner5_id).bind(45000.00).execute(&pool).await?;


    // 9. Seed Project Phases
    println!("📅 Seeding project phases...");
    let ph1_p1 = Uuid::parse_str("33333333-0000-0000-0000-111111111101")?;
    let ph2_p1 = Uuid::parse_str("33333333-0000-0000-0000-111111111102")?;
    let ph1_p2 = Uuid::parse_str("33333333-0000-0000-0000-222222222201")?;
    let ph2_p2 = Uuid::parse_str("33333333-0000-0000-0000-222222222202")?;
    let ph1_p3 = Uuid::parse_str("33333333-0000-0000-0000-333333333301")?;
    let ph2_p3 = Uuid::parse_str("33333333-0000-0000-0000-333333333302")?;
    let ph1_p4 = Uuid::parse_str("33333333-0000-0000-0000-444444444401")?;
    let ph2_p4 = Uuid::parse_str("33333333-0000-0000-0000-444444444402")?;
    let ph1_p5 = Uuid::parse_str("33333333-0000-0000-0000-555555555501")?;
    let ph2_p5 = Uuid::parse_str("33333333-0000-0000-0000-555555555502")?;

    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 1: Feasibility & Procurement', 1)")
        .bind(ph1_p1).bind(proj1_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 2: Execution & Commissioning', 2)")
        .bind(ph2_p1).bind(proj1_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 1: Planning', 1)")
        .bind(ph1_p2).bind(proj2_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 2: Construction', 2)")
        .bind(ph2_p2).bind(proj2_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 1: Preparation', 1)")
        .bind(ph1_p3).bind(proj3_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 2: Implementation', 2)")
        .bind(ph2_p3).bind(proj3_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 1: Initiation', 1)")
        .bind(ph1_p4).bind(proj4_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 2: Operationalization', 2)")
        .bind(ph2_p4).bind(proj4_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 1: Blueprint Development', 1)")
        .bind(ph1_p5).bind(proj5_id).execute(&pool).await?;
    sqlx::query("INSERT INTO phases (id, project_id, name, sort_order) VALUES ($1, $2, 'Phase 2: Field Deployment Blueprint', 2)")
        .bind(ph2_p5).bind(proj5_id).execute(&pool).await?;

    // 10. Seed Tasks (5 tasks per project)
    println!("🛠️ Seeding project tasks...");
    // Project 1 Tasks
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Conduct Geological Surveying', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj1_id).bind(ph1_p1).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 1, 20)).bind(NaiveDate::from_ymd_opt(2026, 2, 5)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Acquire Local Government Permits', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj1_id).bind(ph1_p1).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 2, 6)).bind(NaiveDate::from_ymd_opt(2026, 2, 25)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Borehole Drilling and Casing', 'IN_PROGRESS'::task_status, $4, $5)")
        .bind(proj1_id).bind(ph2_p1).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2026, 3, 1)).bind(NaiveDate::from_ymd_opt(2026, 6, 20)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Install Solar Pump and Storage Tank', 'PLAN'::task_status, $4, $5)")
        .bind(proj1_id).bind(ph2_p1).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2026, 6, 21)).bind(NaiveDate::from_ymd_opt(2026, 7, 15)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Water Quality Testing', 'PLAN'::task_status, $4, $5)")
        .bind(proj1_id).bind(ph2_p1).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 7, 16)).bind(NaiveDate::from_ymd_opt(2026, 7, 25)).execute(&pool).await?;

    // Project 2 Tasks
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Conduct Clinic Needs Assessment', 'IN_PROGRESS'::task_status, $4, $5)")
        .bind(proj2_id).bind(ph1_p2).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 6, 5)).bind(NaiveDate::from_ymd_opt(2026, 6, 25)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Procure Medical Refurbishment Materials', 'PLAN'::task_status, $4, $5)")
        .bind(proj2_id).bind(ph1_p2).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 6, 26)).bind(NaiveDate::from_ymd_opt(2026, 7, 20)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Refurbish Primary Ward Room', 'PLAN'::task_status, $4, $5)")
        .bind(proj2_id).bind(ph2_p2).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2026, 7, 21)).bind(NaiveDate::from_ymd_opt(2026, 8, 30)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Install Pediatric Care Beds', 'PLAN'::task_status, $4, $5)")
        .bind(proj2_id).bind(ph2_p2).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2026, 9, 1)).bind(NaiveDate::from_ymd_opt(2026, 9, 15)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Final Inspection and Handover', 'PLAN'::task_status, $4, $5)")
        .bind(proj2_id).bind(ph2_p2).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 9, 16)).bind(NaiveDate::from_ymd_opt(2026, 9, 25)).execute(&pool).await?;

    // Project 3 Tasks
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Design Sanitation Block Specs', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj3_id).bind(ph1_p3).bind(officer_id).bind(NaiveDate::from_ymd_opt(2025, 9, 5)).bind(NaiveDate::from_ymd_opt(2025, 9, 25)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Contract Local Sanitation Laborers', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj3_id).bind(ph1_p3).bind(officer_id).bind(NaiveDate::from_ymd_opt(2025, 10, 1)).bind(NaiveDate::from_ymd_opt(2025, 10, 20)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Excavation and Foundation Construction', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj3_id).bind(ph2_p3).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2025, 11, 1)).bind(NaiveDate::from_ymd_opt(2025, 12, 10)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Install Piping and Plumbing Blocks', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj3_id).bind(ph2_p3).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2025, 12, 11)).bind(NaiveDate::from_ymd_opt(2026, 2, 28)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Handover Sanitation Facilities', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj3_id).bind(ph2_p3).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 3, 1)).bind(NaiveDate::from_ymd_opt(2026, 5, 15)).execute(&pool).await?;

    // Project 4 Tasks
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Draft Vocational Curriculum', 'COMPLETED'::task_status, $4, $5)")
        .bind(proj4_id).bind(ph1_p4).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 3, 15)).bind(NaiveDate::from_ymd_opt(2026, 4, 15)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Assemble Vocational Training Desks', 'IN_PROGRESS'::task_status, $4, $5)")
        .bind(proj4_id).bind(ph1_p4).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 4, 16)).bind(NaiveDate::from_ymd_opt(2026, 7, 30)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Install Electricity and Lights', 'PLAN'::task_status, $4, $5)")
        .bind(proj4_id).bind(ph2_p4).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2026, 8, 1)).bind(NaiveDate::from_ymd_opt(2026, 8, 20)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Hire Vocational Instructors', 'PLAN'::task_status, $4, $5)")
        .bind(proj4_id).bind(ph2_p4).bind(officer2_id).bind(NaiveDate::from_ymd_opt(2026, 8, 21)).bind(NaiveDate::from_ymd_opt(2026, 9, 15)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Launch First Training Cohort', 'PLAN'::task_status, $4, $5)")
        .bind(proj4_id).bind(ph2_p4).bind(officer_id).bind(NaiveDate::from_ymd_opt(2026, 9, 16)).bind(NaiveDate::from_ymd_opt(2026, 11, 25)).execute(&pool).await?;

    // Project 5 Tasks
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Geological Survey Blueprint Task', 'PLAN'::task_status, $4, $5)")
        .bind(proj5_id).bind(ph1_p5).bind(std::convert::identity(None::<Uuid>)).bind(NaiveDate::from_ymd_opt(2026, 7, 1)).bind(NaiveDate::from_ymd_opt(2026, 7, 15)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Government Permitting Blueprint Task', 'PLAN'::task_status, $4, $5)")
        .bind(proj5_id).bind(ph1_p5).bind(std::convert::identity(None::<Uuid>)).bind(NaiveDate::from_ymd_opt(2026, 7, 16)).bind(NaiveDate::from_ymd_opt(2026, 8, 5)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Borehole Drilling Blueprint Task', 'PLAN'::task_status, $4, $5)")
        .bind(proj5_id).bind(ph2_p5).bind(std::convert::identity(None::<Uuid>)).bind(NaiveDate::from_ymd_opt(2026, 8, 6)).bind(NaiveDate::from_ymd_opt(2026, 8, 25)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Solar Pump Installation Blueprint Task', 'PLAN'::task_status, $4, $5)")
        .bind(proj5_id).bind(ph2_p5).bind(std::convert::identity(None::<Uuid>)).bind(NaiveDate::from_ymd_opt(2026, 8, 26)).bind(NaiveDate::from_ymd_opt(2026, 9, 10)).execute(&pool).await?;
    sqlx::query("INSERT INTO tasks (project_id, phase_id, assigned_to, name, status, start_date, end_date) VALUES ($1, $2, $3, 'Water Quality Blueprint Task', 'PLAN'::task_status, $4, $5)")
        .bind(proj5_id).bind(ph2_p5).bind(std::convert::identity(None::<Uuid>)).bind(NaiveDate::from_ymd_opt(2026, 9, 11)).bind(NaiveDate::from_ymd_opt(2026, 9, 25)).execute(&pool).await?;

    // 11. Seed Project Impact Metrics
    println!("📊 Seeding project impact metrics...");
    let people_template = template_ids.get("PEOPLE_SERVED").unwrap();
    let wells_template = template_ids.get("WELLS_CONSTRUCTED").unwrap();
    let schools_template = template_ids.get("SCHOOLS_CONSTRUCTED").unwrap();
    let health_template = template_ids.get("HEALTH_POSTS_CONSTRUCTED").unwrap();
    let sanitation_template = template_ids.get("SANITATION_BLOCKS_BUILT").unwrap();
    let trafficking_template = template_ids.get("TRAFFICKING_PREVENTED").unwrap();

    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 5, 2)")
        .bind(proj1_id).bind(wells_template).execute(&pool).await?;
    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 10000, 3500)")
        .bind(proj1_id).bind(people_template).execute(&pool).await?;

    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 2, 0)")
        .bind(proj2_id).bind(health_template).execute(&pool).await?;
    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 5000, 100)")
        .bind(proj2_id).bind(people_template).execute(&pool).await?;

    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 3, 3)")
        .bind(proj3_id).bind(sanitation_template).execute(&pool).await?;
    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 1200, 1200)")
        .bind(proj3_id).bind(people_template).execute(&pool).await?;

    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 800, 250)")
        .bind(proj4_id).bind(trafficking_template).execute(&pool).await?;

    sqlx::query("INSERT INTO project_impact_metrics (project_id, metric_template_id, target_value, current_value) VALUES ($1, $2, 1, 0)")
        .bind(proj5_id).bind(schools_template).execute(&pool).await?;

    // 12. Seed 5 Alerts
    println!("🚨 Seeding 5 alerts...");
    sqlx::query("INSERT INTO alerts (project_id, message, severity) VALUES ($1, $2, 'HIGH')")
        .bind(proj4_id).bind("Project spent budget has exceeded 100% of allocation (Alert triggered by $120,000 spent vs $45,000 allocated).").execute(&pool).await?;
    sqlx::query("INSERT INTO alerts (project_id, message, severity) VALUES ($1, $2, 'CRITICAL')")
        .bind(proj1_id).bind("Delay in shipping solar pump components. Potential delay in execution phase.").execute(&pool).await?;
    sqlx::query("INSERT INTO alerts (project_id, message, severity) VALUES ($1, $2, 'CRITICAL')")
        .bind(proj2_id).bind("Permit approval delayed by local administration in North Gondar.").execute(&pool).await?;
    sqlx::query("INSERT INTO alerts (project_id, message, severity) VALUES ($1, $2, 'WARNING')")
        .bind(proj4_id).bind("Vocational center supply shipment delayed by local customs checkpoint.").execute(&pool).await?;
    sqlx::query("INSERT INTO alerts (project_id, message, severity) VALUES ($1, $2, 'WARNING')")
        .bind(proj1_id).bind("Heavy rainfall warning expected to temporarily halt drilling works at Ada'a Site.").execute(&pool).await?;

    // 13. Seed 5 Field Logs
    println!("📝 Seeding 5 field logs...");
    sqlx::query("INSERT INTO field_logs (project_id, author_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(officer_id).bind("Conducted site inspection at Ada'a woreda. Drilling foundation is successfully poured and currently curing.").execute(&pool).await?;
    sqlx::query("INSERT INTO field_logs (project_id, author_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(officer2_id).bind("Received borehole casing pipes shipment. 3 pieces were damaged in transit; replacements have been requested.").execute(&pool).await?;
    sqlx::query("INSERT INTO field_logs (project_id, author_id, content) VALUES ($1, $2, $3)")
        .bind(proj3_id).bind(officer_id).bind("Community assembly held at Adigrat primary school to discuss sanitation block maintenance procedures.").execute(&pool).await?;
    sqlx::query("INSERT INTO field_logs (project_id, author_id, content) VALUES ($1, $2, $3)")
        .bind(proj4_id).bind(officer_id).bind("Training center vocational desks and materials delivered to site. Local security guard hired to secure materials.").execute(&pool).await?;
    sqlx::query("INSERT INTO field_logs (project_id, author_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(officer_id).bind("Water sample collected from the newly drilled borehole and dispatched to the national lab for quality analysis.").execute(&pool).await?;

    // 14. Seed 5 Chat Messages
    println!("💬 Seeding 5 chat messages...");
    sqlx::query("INSERT INTO project_messages (project_id, sender_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(admin_id).bind("Hey team, welcome to the East Shewa project chat! Please log updates here.").execute(&pool).await?;
    sqlx::query("INSERT INTO project_messages (project_id, sender_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(pm_id).bind("Has the geological survey report been uploaded to the system?").execute(&pool).await?;
    sqlx::query("INSERT INTO project_messages (project_id, sender_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(officer_id).bind("Yes, it is uploaded under the Files tab this morning.").execute(&pool).await?;
    sqlx::query("INSERT INTO project_messages (project_id, sender_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(pm_id).bind("Excellent. I will review and submit the permit application today.").execute(&pool).await?;
    sqlx::query("INSERT INTO project_messages (project_id, sender_id, content) VALUES ($1, $2, $3)")
        .bind(proj1_id).bind(admin_id).bind("Great work team! Let's keep up this momentum.").execute(&pool).await?;


    println!("🎉 Rich database seeding completed successfully!");
    Ok(())
}

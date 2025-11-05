import pandas as pd

print("Loading companies_full.csv...")
df = pd.read_csv('output/companies_full.csv', dtype=str)

print(f"Current columns: {len(df.columns)}")

# Reorder columns to match table definition (excluding id which is auto-generated)
ordered_columns = [
    'expediente', 'ruc', 'nombre', 'tipo', 'pro_codigo', 'provincia',
    'anio', 'posicion_general', 'cia_imvalores', 'id_estado_financiero',
    'ingresos_ventas', 'activos', 'patrimonio', 'utilidad_an_imp', 'impuesto_renta',
    'n_empleados', 'ingresos_totales', 'utilidad_ejercicio', 'utilidad_neta',
    'cod_segmento', 'ciiu_n1', 'ciiu_n6',
    'liquidez_corriente', 'prueba_acida', 'end_activo', 'end_patrimonial',
    'end_activo_fijo', 'end_corto_plazo', 'end_largo_plazo', 'cobertura_interes',
    'apalancamiento', 'apalancamiento_financiero', 'end_patrimonial_ct',
    'end_patrimonial_nct', 'apalancamiento_c_l_plazo', 'rot_cartera',
    'rot_activo_fijo', 'rot_ventas', 'per_med_cobranza', 'per_med_pago',
    'impac_gasto_a_v', 'impac_carga_finan', 'rent_neta_activo',
    'margen_bruto', 'margen_operacional', 'rent_neta_ventas',
    'rent_ope_patrimonio', 'rent_ope_activo', 'roe', 'roa',
    'fortaleza_patrimonial', 'gastos_financieros', 'gastos_admin_ventas',
    'depreciaciones', 'amortizaciones', 'costos_ventas_prod',
    'deuda_total', 'deuda_total_c_plazo', 'total_gastos',
    'ciiu', 'descripcion', 'id_segmento', 'segmento',
    'nombre_comercial', 'canton', 'ciudad', 'actividad_principal',
    'estado_empresa', 'tipo_empresa', 'segmento_empresa', 'fecha_constitucion'
]

# Add missing columns with NULL values
for col in ordered_columns:
    if col not in df.columns:
        df[col] = None
        print(f"Added missing column: {col}")

# Reorder to match table
df = df[ordered_columns]

print(f"Final columns: {len(df.columns)}")
print(f"Rows: {len(df):,}")

print("Saving to output/companies_final.csv...")
df.to_csv('output/companies_final.csv', index=False)

print("Done! Ready to upload to Supabase")

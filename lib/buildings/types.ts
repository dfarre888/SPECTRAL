export type BuildingMaterialClass =
  | 'concrete'
  | 'brick'
  | 'glass'
  | 'steel'
  | 'wood'

export interface BuildingFootprint {
  id: string
  tenantId: string
  source: 'osm' | 'customer_upload'
  polygon: { lat: number; lon: number }[]
  height_m: number
  material_class: BuildingMaterialClass
  classification: string
}

export interface BuildingRayHit {
  buildingId: string
  penetration_loss_db: number
  obstructed: boolean
}

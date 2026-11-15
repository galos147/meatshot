
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alerts": {
                  Row: {
                    "acknowledged_at": string | null,"acknowledged_by": string | null,"alert_type": Database["public"]['Enums']["alert_type"],"batch_id": string | null,"certificate_id": string | null,"created_at": string,"dedupe_key": string,"id": string,"message": string,"product_id": string | null,"resolved_at": string | null,"severity": Database["public"]['Enums']["alert_severity"],"status": Database["public"]['Enums']["alert_status"],"threshold_days": number | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"acknowledged_by"?: string | null,"alert_type": Database["public"]['Enums']["alert_type"],"batch_id"?: string | null,"certificate_id"?: string | null,"created_at"?: string,"dedupe_key": string,"id"?: string,"message": string,"product_id"?: string | null,"resolved_at"?: string | null,"severity": Database["public"]['Enums']["alert_severity"],"status"?: Database["public"]['Enums']["alert_status"],"threshold_days"?: number | null,"title": string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"acknowledged_by"?: string | null,"alert_type"?: Database["public"]['Enums']["alert_type"],"batch_id"?: string | null,"certificate_id"?: string | null,"created_at"?: string,"dedupe_key"?: string,"id"?: string,"message"?: string,"product_id"?: string | null,"resolved_at"?: string | null,"severity"?: Database["public"]['Enums']["alert_severity"],"status"?: Database["public"]['Enums']["alert_status"],"threshold_days"?: number | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_acknowledged_by_fkey"
      columns: ["acknowledged_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_certificate_id_fkey"
      columns: ["certificate_id"]
isOneToOne: false
      referencedRelation: "kosher_certificates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "alerts_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_stock"
      referencedColumns: ["product_id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "default_min_stock_kg": number,"expiry_alert_days": (number)[],"id": number,"store_name": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "default_min_stock_kg"?: number,"expiry_alert_days"?: (number)[],"id"?: number,"store_name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "default_min_stock_kg"?: number,"expiry_alert_days"?: (number)[],"id"?: number,"store_name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"created_at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"record_id": string | null,"table_name": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"record_id"?: string | null,"table_name": string,"user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"record_id"?: string | null,"table_name"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"batch_documents": {
                  Row: {
                    "batch_id": string,"created_at": string,"doc_type": string,"file_name": string,"file_path": string,"id": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"doc_type"?: string,"file_name": string,"file_path": string,"id"?: string,"uploaded_by"?: string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"doc_type"?: string,"file_name"?: string,"file_path"?: string,"id"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "batch_documents_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_documents_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"batches": {
                  Row: {
                    "batch_number": string,"cost_price_per_kg": number,"created_at": string,"created_by": string,"expiry_date": string,"id": string,"initial_packages": number,"initial_qty_kg": number,"kosher_body_id": string,"kosher_certificate_id": string | null,"notes": string | null,"product_id": string,"production_date": string | null,"receipt_id": string | null,"received_date": string,"supplier_id": string,"supplier_lot": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_number": string,"cost_price_per_kg": number,"created_at"?: string,"created_by": string,"expiry_date": string,"id"?: string,"initial_packages"?: number,"initial_qty_kg": number,"kosher_body_id": string,"kosher_certificate_id"?: string | null,"notes"?: string | null,"product_id": string,"production_date"?: string | null,"receipt_id"?: string | null,"received_date": string,"supplier_id": string,"supplier_lot"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "batch_number"?: string,"cost_price_per_kg"?: number,"created_at"?: string,"created_by"?: string,"expiry_date"?: string,"id"?: string,"initial_packages"?: number,"initial_qty_kg"?: number,"kosher_body_id"?: string,"kosher_certificate_id"?: string | null,"notes"?: string | null,"product_id"?: string,"production_date"?: string | null,"receipt_id"?: string | null,"received_date"?: string,"supplier_id"?: string,"supplier_lot"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_kosher_body_id_fkey"
      columns: ["kosher_body_id"]
isOneToOne: false
      referencedRelation: "kosher_bodies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_kosher_certificate_id_fkey"
      columns: ["kosher_certificate_id"]
isOneToOne: false
      referencedRelation: "kosher_certificates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_stock"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: false
      referencedRelation: "receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "color": string | null,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inventory_transactions": {
                  Row: {
                    "batch_id": string,"created_at": string,"created_by": string,"id": number,"location_id": string,"packages_delta": number,"qty_kg_delta": number,"reason": string | null,"ref_id": string | null,"ref_table": string | null,"reverses_txn_id": number | null,"txn_type": Database["public"]['Enums']["txn_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"created_by": string,"id"?: never,"location_id": string,"packages_delta"?: number,"qty_kg_delta": number,"reason"?: string | null,"ref_id"?: string | null,"ref_table"?: string | null,"reverses_txn_id"?: number | null,"txn_type": Database["public"]['Enums']["txn_type"]
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: never,"location_id"?: string,"packages_delta"?: number,"qty_kg_delta"?: number,"reason"?: string | null,"ref_id"?: string | null,"ref_table"?: string | null,"reverses_txn_id"?: number | null,"txn_type"?: Database["public"]['Enums']["txn_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_transactions_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_reverses_txn_id_fkey"
      columns: ["reverses_txn_id"]
isOneToOne: true
      referencedRelation: "inventory_transactions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_reverses_txn_id_fkey"
      columns: ["reverses_txn_id"]
isOneToOne: true
      referencedRelation: "v_transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"kosher_bodies": {
                  Row: {
                    "contact": string | null,"created_at": string,"id": string,"is_active": boolean,"level_id": string | null,"name": string,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"level_id"?: string | null,"name": string,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "contact"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"level_id"?: string | null,"name"?: string,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kosher_bodies_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "kosher_levels"
      referencedColumns: ["id"]
    }
                  ]
                },"kosher_certificates": {
                  Row: {
                    "certificate_number": string,"created_at": string,"document_path": string | null,"id": string,"is_active": boolean,"kosher_body_id": string,"notes": string | null,"supplier_id": string | null,"updated_at": string,"valid_from": string | null,"valid_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "certificate_number": string,"created_at"?: string,"document_path"?: string | null,"id"?: string,"is_active"?: boolean,"kosher_body_id": string,"notes"?: string | null,"supplier_id"?: string | null,"updated_at"?: string,"valid_from"?: string | null,"valid_until": string
                  }
                  Update: {
                    "certificate_number"?: string,"created_at"?: string,"document_path"?: string | null,"id"?: string,"is_active"?: boolean,"kosher_body_id"?: string,"notes"?: string | null,"supplier_id"?: string | null,"updated_at"?: string,"valid_from"?: string | null,"valid_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kosher_certificates_kosher_body_id_fkey"
      columns: ["kosher_body_id"]
isOneToOne: false
      referencedRelation: "kosher_bodies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kosher_certificates_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"kosher_levels": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"rank": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"rank"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"rank"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"location_types": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "barcode": string | null,"category_id": string | null,"cost_price_per_kg": number,"created_at": string,"description": string | null,"id": string,"image_path": string | null,"is_active": boolean,"min_stock_kg": number,"name": string,"sale_price_per_kg": number,"sku": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "barcode"?: string | null,"category_id"?: string | null,"cost_price_per_kg"?: number,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"min_stock_kg"?: number,"name": string,"sale_price_per_kg": number,"sku": string,"updated_at"?: string
                  }
                  Update: {
                    "barcode"?: string | null,"category_id"?: string | null,"cost_price_per_kg"?: number,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"min_stock_kg"?: number,"name"?: string,"sale_price_per_kg"?: number,"sku"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name": string,"id": string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"receipts": {
                  Row: {
                    "created_at": string,"created_by": string,"delivery_note_number": string | null,"id": string,"notes": string | null,"receipt_number": number,"received_date": string,"supplier_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"delivery_note_number"?: string | null,"id"?: string,"notes"?: string | null,"receipt_number"?: never,"received_date": string,"supplier_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"delivery_note_number"?: string | null,"id"?: string,"notes"?: string | null,"receipt_number"?: never,"received_date"?: string,"supplier_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"sale_items": {
                  Row: {
                    "batch_id": string,"cost_per_kg": number,"discount_amount": number,"gross_amount": number,"id": string,"line_no": number,"line_total": number,"location_id": string,"packages": number,"price_per_kg": number,"product_id": string,"qty_kg": number,"returned_packages": number,"returned_qty_kg": number,"sale_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"cost_per_kg": number,"discount_amount"?: number,"gross_amount": number,"id"?: string,"line_no": number,"line_total": number,"location_id": string,"packages"?: number,"price_per_kg": number,"product_id": string,"qty_kg": number,"returned_packages"?: number,"returned_qty_kg"?: number,"sale_id": string
                  }
                  Update: {
                    "batch_id"?: string,"cost_per_kg"?: number,"discount_amount"?: number,"gross_amount"?: number,"id"?: string,"line_no"?: number,"line_total"?: number,"location_id"?: string,"packages"?: number,"price_per_kg"?: number,"product_id"?: string,"qty_kg"?: number,"returned_packages"?: number,"returned_qty_kg"?: number,"sale_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_items_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "sale_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_stock"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_costs"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"sale_return_items": {
                  Row: {
                    "id": string,"location_id": string | null,"packages": number,"qty_kg": number,"refund_amount": number,"restocked": boolean,"return_id": string,"sale_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"location_id"?: string | null,"packages"?: number,"qty_kg": number,"refund_amount"?: number,"restocked": boolean,"return_id": string,"sale_item_id": string
                  }
                  Update: {
                    "id"?: string,"location_id"?: string | null,"packages"?: number,"qty_kg"?: number,"refund_amount"?: number,"restocked"?: boolean,"return_id"?: string,"sale_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_return_items_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_return_items_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "sale_returns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_return_items_sale_item_id_fkey"
      columns: ["sale_item_id"]
isOneToOne: false
      referencedRelation: "sale_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_return_items_sale_item_id_fkey"
      columns: ["sale_item_id"]
isOneToOne: false
      referencedRelation: "v_sale_item_costs"
      referencedColumns: ["sale_item_id"]
    }
                  ]
                },"sale_returns": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"reason": string,"refund_amount": number,"return_number": number,"sale_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"reason": string,"refund_amount"?: number,"return_number"?: never,"sale_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"reason"?: string,"refund_amount"?: number,"return_number"?: never,"sale_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_returns_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_returns_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_returns_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_costs"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"sales": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"created_at": string,"created_by": string,"customer_name": string | null,"id": string,"idempotency_key": string,"items_discount": number,"kosher_body_ids": (string)[],"notes": string | null,"sale_discount": number,"sale_number": number,"status": Database["public"]['Enums']["sale_status"],"subtotal": number,"total": number,"total_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"created_by": string,"customer_name"?: string | null,"id"?: string,"idempotency_key": string,"items_discount"?: number,"kosher_body_ids"?: (string)[],"notes"?: string | null,"sale_discount"?: number,"sale_number"?: never,"status"?: Database["public"]['Enums']["sale_status"],"subtotal"?: number,"total"?: number,"total_cost"?: number
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"created_by"?: string,"customer_name"?: string | null,"id"?: string,"idempotency_key"?: string,"items_discount"?: number,"kosher_body_ids"?: (string)[],"notes"?: string | null,"sale_discount"?: number,"sale_number"?: never,"status"?: Database["public"]['Enums']["sale_status"],"subtotal"?: number,"total"?: number,"total_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_levels": {
                  Row: {
                    "batch_id": string,"location_id": string,"packages": number,"qty_kg": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"location_id": string,"packages"?: number,"qty_kg"?: number,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"location_id"?: string,"packages"?: number,"qty_kg"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_levels_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_levels_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_levels_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_transfers": {
                  Row: {
                    "batch_id": string,"created_at": string,"created_by": string,"from_location_id": string,"id": string,"notes": string | null,"packages": number,"qty_kg": number,"to_location_id": string,"transfer_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"created_by": string,"from_location_id": string,"id"?: string,"notes"?: string | null,"packages"?: number,"qty_kg": number,"to_location_id": string,"transfer_number"?: never
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"created_by"?: string,"from_location_id"?: string,"id"?: string,"notes"?: string | null,"packages"?: number,"qty_kg"?: number,"to_location_id"?: string,"transfer_number"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_transfers_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_transfers_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_transfers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_transfers_from_location_id_fkey"
      columns: ["from_location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_transfers_to_location_id_fkey"
      columns: ["to_location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    }
                  ]
                },"storage_locations": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"is_active": boolean,"location_type_id": string | null,"name": string,"notes": string | null,"shelf": string | null,"temp_max": number | null,"temp_min": number | null,"updated_at": string,"warehouse_id": string,"zone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"location_type_id"?: string | null,"name": string,"notes"?: string | null,"shelf"?: string | null,"temp_max"?: number | null,"temp_min"?: number | null,"updated_at"?: string,"warehouse_id": string,"zone"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"location_type_id"?: string | null,"name"?: string,"notes"?: string | null,"shelf"?: string | null,"temp_max"?: number | null,"temp_min"?: number | null,"updated_at"?: string,"warehouse_id"?: string,"zone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "storage_locations_location_type_id_fkey"
      columns: ["location_type_id"]
isOneToOne: false
      referencedRelation: "location_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "storage_locations_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"suppliers": {
                  Row: {
                    "address": string | null,"business_number": string | null,"contact_name": string | null,"created_at": string,"email": string | null,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["supplier_kind"],"name": string,"notes": string | null,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"business_number"?: string | null,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["supplier_kind"],"name": string,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"business_number"?: string | null,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["supplier_kind"],"name"?: string,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"warehouses": {
                  Row: {
                    "address": string | null,"code": string | null,"created_at": string,"id": string,"is_active": boolean,"name": string,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"code"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"code"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "v_batches": {
                  Row: {
                    "batch_number": string,"certificate_number": string | null,"certificate_valid_until": string | null,"cost_price_per_kg": number | null,"created_at": string,"created_by": string,"days_to_expiry": number | null,"expiry_date": string,"id": string,"initial_packages": number,"initial_qty_kg": number,"kosher_body_id": string,"kosher_body_name": string,"kosher_certificate_id": string | null,"location_names": (string)[] | null,"notes": string | null,"packages": number | null,"product_id": string,"product_name": string,"production_date": string | null,"qty_kg": number | null,"receipt_id": string | null,"received_date": string,"sku": string,"supplier_id": string,"supplier_lot": string | null,"supplier_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_kosher_body_id_fkey"
      columns: ["kosher_body_id"]
isOneToOne: false
      referencedRelation: "kosher_bodies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_kosher_certificate_id_fkey"
      columns: ["kosher_certificate_id"]
isOneToOne: false
      referencedRelation: "kosher_certificates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_stock"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: false
      referencedRelation: "receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"v_product_costs": {
                  Row: {
                    "cost_price_per_kg": number,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "cost_price_per_kg"?: number | null,"product_id"?: string | null
                         }
                        Update: {
                           "cost_price_per_kg"?: number | null,"product_id"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"v_product_stock": {
                  Row: {
                    "barcode": string | null,"batch_count": number | null,"category_id": string | null,"category_name": string | null,"cost_price_per_kg": number | null,"cost_value": number | null,"image_path": string | null,"is_active": boolean,"is_low_stock": boolean | null,"min_stock_kg": number,"nearest_expiry": string | null,"packages": number | null,"product_id": string,"product_name": string,"qty_kg": number | null,"sale_price_per_kg": number,"sellable_qty_kg": number | null,"sku": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"v_sale_costs": {
                  Row: {
                    "created_at": string,"sale_id": string,"status": Database["public"]['Enums']["sale_status"],"total_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"sale_id"?: string | null,"status"?: Database["public"]['Enums']["sale_status"] | null,"total_cost"?: number | null
                         }
                        Update: {
                           "created_at"?: string | null,"sale_id"?: string | null,"status"?: Database["public"]['Enums']["sale_status"] | null,"total_cost"?: number | null
                         }
                        Relationships: [
                    
                  ]
                },"v_sale_item_costs": {
                  Row: {
                    "cost_per_kg": number,"sale_id": string,"sale_item_id": string,"sold_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_costs"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"v_stock": {
                  Row: {
                    "barcode": string | null,"batch_id": string,"batch_number": string,"category_id": string | null,"category_name": string | null,"certificate_number": string | null,"certificate_valid_until": string | null,"cost_price_per_kg": number | null,"cost_value": number | null,"days_to_expiry": number | null,"expiry_date": string,"is_sellable": boolean | null,"kosher_body_id": string,"kosher_body_name": string,"kosher_certificate_id": string | null,"location_code": string,"location_id": string,"location_name": string,"location_type_name": string | null,"packages": number,"product_id": string,"product_name": string,"production_date": string | null,"qty_kg": number,"received_date": string,"sale_price_per_kg": number,"sale_value": number | null,"sell_block_reason": string | null,"sku": string,"supplier_id": string,"supplier_lot": string | null,"supplier_name": string,"warehouse_id": string,"warehouse_name": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "batches_kosher_body_id_fkey"
      columns: ["kosher_body_id"]
isOneToOne: false
      referencedRelation: "kosher_bodies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_kosher_certificate_id_fkey"
      columns: ["kosher_certificate_id"]
isOneToOne: false
      referencedRelation: "kosher_certificates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_stock"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_levels_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_levels_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_levels_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "storage_locations_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"v_transactions": {
                  Row: {
                    "batch_id": string,"batch_number": string,"created_at": string,"created_by": string,"created_by_name": string | null,"id": number,"location_id": string,"location_name": string,"packages_delta": number,"product_id": string,"product_name": string,"qty_kg_delta": number,"reason": string | null,"ref_id": string | null,"ref_table": string | null,"reverses_txn_id": number | null,"sku": string,"txn_type": Database["public"]['Enums']["txn_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_costs"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "batches_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "v_product_stock"
      referencedColumns: ["product_id"]
    },{
      foreignKeyName: "inventory_transactions_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "v_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "storage_locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_reverses_txn_id_fkey"
      columns: ["reverses_txn_id"]
isOneToOne: true
      referencedRelation: "inventory_transactions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_transactions_reverses_txn_id_fkey"
      columns: ["reverses_txn_id"]
isOneToOne: true
      referencedRelation: "v_transactions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "_apply_stock_delta":
{ Args: { "p_batch": string,"p_location": string,"p_packages": number,"p_qty": number,"p_reason"?: string,"p_ref_id"?: string,"p_ref_table"?: string,"p_reverses"?: number,"p_type": Database["public"]['Enums']["txn_type"],"p_user": string }; Returns: number
                           },
"_lock_stock":
{ Args: { "p_keys": Json }; Returns: undefined
                           },
"_require_role":
{ Args: { "roles": (Database["public"]['Enums']["app_role"])[] }; Returns: string
                           },
"adjust_stock":
{ Args: { "p_batch_id": string,"p_kind": Database["public"]['Enums']["txn_type"],"p_location_id": string,"p_packages_delta": number,"p_qty_delta": number,"p_reason": string }; Returns: number
                           },
"available_stock":
{ Args: { "p_kosher_body_ids"?: (string)[],"p_product_id": string }; Returns: {
              "batch_id": string,"batch_number": string,"block_reason": string,"days_to_expiry": number,"expiry_date": string,"is_sellable": boolean,"kosher_body_id": string,"kosher_body_name": string,"location_id": string,"location_name": string,"packages": number,"qty_kg": number,"sale_price_per_kg": number,"warehouse_name": string
            }[]
                           },
"can_read_stock":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_see_costs":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"cancel_sale":
{ Args: { "p_reason": string,"p_sale_id": string }; Returns: undefined
                           },
"create_sale":
{ Args: { "p_customer_name"?: string,"p_idempotency_key": string,"p_items": Json,"p_kosher_body_ids"?: (string)[],"p_notes"?: string,"p_sale_discount"?: number }; Returns: string
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"generate_alerts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"has_role":
{ Args: { "roles": (Database["public"]['Enums']["app_role"])[] }; Returns: boolean
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"receive_goods":
{ Args: { "p_receipt": Json }; Returns: string
                           },
"return_sale_items":
{ Args: { "p_items": Json,"p_reason": string,"p_sale_id": string }; Returns: string
                           },
"reverse_transaction":
{ Args: { "p_reason": string,"p_txn_id": number }; Returns: number
                           },
"store_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"transfer_stock":
{ Args: { "p_batch_id": string,"p_from_location": string,"p_notes"?: string,"p_packages"?: number,"p_qty_kg": number,"p_to_location": string }; Returns: string
                           }
          }
          Enums: {
            "alert_severity": "info"|"warning"|"critical","alert_status": "open"|"acknowledged"|"resolved","alert_type": "expiry_soon"|"expired"|"low_stock"|"kosher_cert_expiring"|"kosher_cert_invalid","app_role": "admin"|"store_manager"|"warehouse_worker"|"sales_employee"|"viewer","sale_status": "completed"|"cancelled","supplier_kind": "supplier"|"factory"|"both","txn_type": "receipt"|"sale"|"sale_cancel"|"sale_return"|"transfer_out"|"transfer_in"|"adjustment"|"waste"|"reversal"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "alert_severity": ["info", "warning", "critical"],"alert_status": ["open", "acknowledged", "resolved"],"alert_type": ["expiry_soon", "expired", "low_stock", "kosher_cert_expiring", "kosher_cert_invalid"],"app_role": ["admin", "store_manager", "warehouse_worker", "sales_employee", "viewer"],"sale_status": ["completed", "cancelled"],"supplier_kind": ["supplier", "factory", "both"],"txn_type": ["receipt", "sale", "sale_cancel", "sale_return", "transfer_out", "transfer_in", "adjustment", "waste", "reversal"]
          }
        }
} as const

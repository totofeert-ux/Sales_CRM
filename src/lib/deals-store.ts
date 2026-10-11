// src/lib/deals-store.ts
export type Deal = { 
  id: string; 
  client_id: string; 
  status: string; 
  amount: number;
  title: string;
  expected_close_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export class DealsStore {
  private map = new Map<string, Deal>();
  
  snapshot(): Deal[] { 
    return Array.from(this.map.values()); 
  }
  
  replaceAll(rows: Deal[]) { 
    this.map.clear(); 
    rows.forEach(d => this.map.set(d.id, d)); 
  }
  
  upsert(d: Deal) { 
    this.map.set(d.id, d); 
  }
  
  delete(id: string) { 
    this.map.delete(id); 
  }
  
  has(id: string) { 
    return this.map.has(id); 
  }
}

export const dealsStore = new DealsStore();

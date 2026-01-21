from ortools.linear_solver import pywraplp
from typing import List, Dict, Any

class LoadOptimizer:
    def __init__(self):
        # 'CBC' (Coin-or Branch and Cut) is the standard open-source MIP solver included with OR-Tools.
        # SCIP sometimes requires manual installation or specific license.
        self.solver = pywraplp.Solver.CreateSolver('CBC')

    def optimize_load(self, cargo_items: List[Dict], vehicles: List[Dict]) -> Dict[str, Any]:
        """
        Solves the Bin Packing Problem to minimize the number of vehicles used.
        """
        print(f"Starting Optimization for {len(cargo_items)} items and {len(vehicles)} vehicles...")
        
        if not self.solver:
            print("ERROR: Solver could not be initialized.")
            return {"error": "Solver not initialized"}
            
        # Variables
        # x[i, j] = 1 if item i is packed in vehicle j.
        x = {}
        # y[j] = 1 if vehicle j is used.
        y = {}
        
        num_items = len(cargo_items)
        num_vehicles = len(vehicles)
        
        for i in range(num_items):
            for j in range(num_vehicles):
                x[i, j] = self.solver.IntVar(0, 1, f'x_{i}_{j}')
                
        for j in range(num_vehicles):
            y[j] = self.solver.IntVar(0, 1, f'y_{j}')
            
        # Constraints
        
        # 1. Each item must be packed in exactly one vehicle.
        for i in range(num_items):
            self.solver.Add(sum(x[i, j] for j in range(num_vehicles)) == 1)
            
        # 2. Weight capacity constraint for each vehicle.
        for j in range(num_vehicles):
            self.solver.Add(
                sum(x[i, j] * cargo_items[i]['weight'] for i in range(num_items)) 
                <= vehicles[j]['capacity_weight'] * y[j]
            )
            
        # 3. Volume capacity constraint (optional, but good for realism)
        for j in range(num_vehicles):
             self.solver.Add(
                sum(x[i, j] * cargo_items[i].get('volume', 0) for i in range(num_items)) 
                <= vehicles[j].get('capacity_volume', 999999) * y[j]
            )

        # Objective: Minimize the number of vehicles used.
        self.solver.Minimize(sum(y[j] for j in range(num_vehicles)))
        
        # Solve
        status = self.solver.Solve()
        
        if status == pywraplp.Solver.OPTIMAL:
            result = {
                "status": "OPTIMAL",
                "total_vehicles_used": 0,
                "assignments": {} 
            }
            
            used_vehicles = 0
            for j in range(num_vehicles):
                if y[j].solution_value() == 1:
                    used_vehicles += 1
                    vehicle_id = vehicles[j]['id']
                    result["assignments"][vehicle_id] = []
                    
                    for i in range(num_items):
                        if x[i, j].solution_value() == 1:
                            result["assignments"][vehicle_id].append(cargo_items[i])
            
            result["total_vehicles_used"] = used_vehicles
            return result
        else:
            return {"status": "INFEASIBLE/FAILED", "details": "Could not find an optimal solution."}

# Simple test if run directly
if __name__ == "__main__":
    optimizer = LoadOptimizer()
    cargo = [{'id': 'box1', 'weight': 10}, {'id': 'box2', 'weight': 10}, {'id': 'box3', 'weight': 10}]
    # 2 small trucks
    fleet = [{'id': 'v1', 'capacity_weight': 20}, {'id': 'v2', 'capacity_weight': 20}, {'id': 'v3', 'capacity_weight': 20}]
    
    print(optimizer.optimize_load(cargo, fleet))

# ML/indian_cascade_predictor.py
"""
Cascading Failure Predictor for Indian Supply Chain
Predicts domino effects of disruptions across the network
"""

from dataclasses import dataclass
from typing import List
import networkx as nx


@dataclass
class CascadeNode:
    """A node affected by cascade"""
    city: str
    cascade_level: int
    impact_probability: float
    estimated_delay_hours: float
    affected_shipments_count: int
    financial_impact_inr: float
    node_type: str  # "warehouse" | "hub" | "city"
    mitigation_possible: bool


@dataclass
class CascadeChain:
    """Complete cascade prediction"""
    trigger_city: str
    trigger_reason: str
    total_affected_nodes: int
    total_affected_shipments: int
    total_financial_impact_inr: float
    estimated_recovery_hours: float
    cascade_nodes: List[CascadeNode]
    recovery_plan: List[str]
    propagation_graph: dict


class IndianCascadePredictor:
    """
    Predicts cascading failures in Indian supply chain network
    """
    
    def __init__(self):
        self.graph = self._build_network_graph()
    
    def _build_network_graph(self):
        """Build Indian logistics network graph"""
        G = nx.DiGraph()
        
        # Major Indian logistics hubs and connections
        hubs = {
            "Mumbai": {"type": "port", "capacity": 1000, "connections": ["Pune", "Nashik", "Ahmedabad"]},
            "Delhi": {"type": "hub", "capacity": 1500, "connections": ["Jaipur", "Chandigarh", "Lucknow"]},
            "Bangalore": {"type": "hub", "capacity": 800, "connections": ["Chennai", "Hyderabad", "Mysore"]},
            "Chennai": {"type": "port", "capacity": 900, "connections": ["Bangalore", "Hyderabad", "Coimbatore"]},
            "Kolkata": {"type": "port", "capacity": 700, "connections": ["Bhubaneswar", "Patna", "Guwahati"]},
            "Hyderabad": {"type": "hub", "capacity": 600, "connections": ["Bangalore", "Chennai", "Vijayawada"]},
            "Pune": {"type": "warehouse", "capacity": 500, "connections": ["Mumbai", "Nashik", "Solapur"]},
            "Ahmedabad": {"type": "hub", "capacity": 550, "connections": ["Mumbai", "Rajkot", "Surat"]},
            "Jaipur": {"type": "warehouse", "capacity": 400, "connections": ["Delhi", "Udaipur", "Jodhpur"]},
            "Lucknow": {"type": "warehouse", "capacity": 450, "connections": ["Delhi", "Kanpur", "Varanasi"]},
        }
        
        for city, data in hubs.items():
            G.add_node(city, **data)
            for connected_city in data["connections"]:
                if connected_city not in G:
                    G.add_node(connected_city, type="city", capacity=200, connections=[])
                G.add_edge(city, connected_city, weight=1.0)
        
        return G
    
    def predict_cascade(self, trigger_city: str, trigger_reason: str,
                       severity: float = 0.7, max_depth: int = 5,
                       affected_shipments_at_trigger: int = 100) -> CascadeChain:
        """
        Predict cascade effect from a trigger event
        
        Args:
            trigger_city: City where disruption starts
            trigger_reason: Reason for disruption
            severity: Severity of disruption (0-1)
            max_depth: Maximum cascade depth
            affected_shipments_at_trigger: Initial affected shipments
        """
        
        if trigger_city not in self.graph:
            # Add as new node
            self.graph.add_node(trigger_city, type="city", capacity=200, connections=[])
        
        cascade_nodes = []
        visited = set()
        queue = [(trigger_city, 0, severity, affected_shipments_at_trigger)]
        
        total_affected = 0
        total_financial = 0.0
        
        while queue and len(cascade_nodes) < 20:
            city, level, prob, shipments = queue.pop(0)
            
            if city in visited or level > max_depth or prob < 0.1:
                continue
            
            visited.add(city)
            
            # Calculate impact for this node
            node_data = self.graph.nodes.get(city, {})
            node_type = node_data.get("type", "city")
            capacity = node_data.get("capacity", 200)
            
            # Impact decreases with distance
            impact_prob = prob * (0.7 ** level)
            delay_hours = severity * 24 * (0.8 ** level)
            affected = int(shipments * impact_prob)
            
            # Financial impact (INR)
            avg_shipment_value = 75000  # Average value per shipment
            delay_cost_per_hour = 500
            financial_impact = (affected * avg_shipment_value * 0.02) + (affected * delay_hours * delay_cost_per_hour)
            
            total_affected += affected
            total_financial += financial_impact
            
            # Create cascade node
            node = CascadeNode(
                city=city,
                cascade_level=level,
                impact_probability=round(impact_prob, 3),
                estimated_delay_hours=round(delay_hours, 1),
                affected_shipments_count=affected,
                financial_impact_inr=round(financial_impact, 2),
                node_type=node_type,
                mitigation_possible=(level <= 2 and prob > 0.3)
            )
            
            cascade_nodes.append(node)
            
            # Propagate to connected nodes
            if city in self.graph:
                for neighbor in self.graph.neighbors(city):
                    if neighbor not in visited:
                        # Propagation weakens
                        next_prob = impact_prob * 0.6
                        next_shipments = int(affected * 0.7)
                        queue.append((neighbor, level + 1, next_prob, next_shipments))
        
        # Recovery plan
        recovery_plan = self._generate_recovery_plan(cascade_nodes, trigger_reason, severity)
        
        # Estimated recovery time
        recovery_hours = severity * 48 + (len(cascade_nodes) * 4)
        
        # Build propagation graph
        prop_graph = {
            "nodes": [{"id": n.city, "level": n.cascade_level, "impact": n.impact_probability} 
                     for n in cascade_nodes],
            "edges": []
        }
        
        return CascadeChain(
            trigger_city=trigger_city,
            trigger_reason=trigger_reason,
            total_affected_nodes=len(cascade_nodes),
            total_affected_shipments=total_affected,
            total_financial_impact_inr=round(total_financial, 2),
            estimated_recovery_hours=round(recovery_hours, 1),
            cascade_nodes=cascade_nodes,
            recovery_plan=recovery_plan,
            propagation_graph=prop_graph
        )
    
    def check_cascade_risk(self, origin_city: str, dest_city: str,
                          current_delay_minutes: float,
                          upstream_delay_minutes: float) -> dict:
        """Quick check for cascade risk"""
        
        base_risk = (current_delay_minutes / 120) * 0.4
        upstream_risk = (upstream_delay_minutes / 180) * 0.6
        
        cascade_risk_score = min(base_risk + upstream_risk, 1.0)
        
        if cascade_risk_score > 0.7:
            level = "critical"
        elif cascade_risk_score > 0.5:
            level = "high"
        elif cascade_risk_score > 0.3:
            level = "medium"
        else:
            level = "low"
        
        # Find next affected nodes
        next_nodes = []
        if dest_city in self.graph:
            next_nodes = list(self.graph.neighbors(dest_city))[:3]
        
        return {
            "cascade_risk_score": round(cascade_risk_score, 3),
            "immediate_cascade_level": level,
            "next_affected_nodes": next_nodes
        }
    
    def _generate_recovery_plan(self, nodes: List[CascadeNode], reason: str, severity: float) -> List[str]:
        """Generate recovery plan based on cascade"""
        plan = []
        
        # Immediate actions
        plan.append(f"1. IMMEDIATE: Contain disruption at {nodes[0].city if nodes else 'trigger point'}")
        
        if severity > 0.7:
            plan.append("2. Activate emergency response team")
            plan.append("3. Reroute all high-priority shipments through alternate hubs")
        
        # Based on reason
        if "warehouse" in reason.lower():
            plan.append("4. Increase processing capacity at alternate warehouses")
            plan.append("5. Deploy temporary storage facilities")
        elif "weather" in reason.lower():
            plan.append("4. Wait for weather clearance before resuming operations")
            plan.append("5. Pre-position vehicles at safe locations")
        elif "strike" in reason.lower() or "protest" in reason.lower():
            plan.append("4. Negotiate with stakeholders for resolution")
            plan.append("5. Use alternate routes avoiding affected areas")
        
        # Recovery actions
        mitigable = [n for n in nodes if n.mitigation_possible]
        if mitigable:
            plan.append(f"6. Focus mitigation on {len(mitigable)} high-impact nodes")
        
        plan.append("7. Increase tracking frequency to every 15 minutes")
        plan.append("8. Communicate delays to all affected customers")
        plan.append("9. Prepare compensation for SLA breaches")
        
        return plan

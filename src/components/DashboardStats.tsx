import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Target,
  Clock
} from "lucide-react"

const stats = [
  {
    title: "Taux de closing",
    value: "23.8%",
    change: "+2.1%",
    trend: "up",
    icon: TrendingUp,
    color: "success"
  },
  {
    title: "Revenus ce mois",
    value: "€18,200",
    change: "+15.3%",
    trend: "up",
    icon: DollarSign,
    color: "primary"
  },
  {
    title: "Nouvelles opportunités",
    value: "12",
    change: "+4",
    trend: "up", 
    icon: Target,
    color: "warning"
  }
]

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg bg-${stat.color}/10`}>
              <stat.icon className={`h-4 w-4 text-${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Badge 
                variant={stat.trend === "up" ? "default" : "secondary"} 
                className="text-xs"
              >
                {stat.change}
              </Badge>
              <span>from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
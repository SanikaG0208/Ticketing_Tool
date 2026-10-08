import React from 'react';
import {useAdminMetrics,MetricsPanel,MetricCards} from './AdminMetrics.jsx';
import {duration} from '../../TicketInsights.jsx';
export default function AdminSla(){const metrics=useAdminMetrics(),d=metrics.data;return <MetricsPanel metrics={metrics}>{d&&<><MetricCards items={[["Average first response",duration(d.average_response_seconds)],["Average resolution",duration(d.average_resolution_seconds)],["Awaiting response",d.awaiting_response]]}/><div className="notice">SLA not configured</div></>}</MetricsPanel>;}

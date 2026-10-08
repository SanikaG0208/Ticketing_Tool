import React from 'react';
import {useAdminMetrics,MetricsPanel,MetricCards} from './AdminMetrics.jsx';
import {duration} from '../../TicketInsights.jsx';
export default function AdminDowntime(){const metrics=useAdminMetrics(),d=metrics.data;return <MetricsPanel metrics={metrics}>{d&&<><MetricCards items={[["Recorded employee downtime",duration(d.recorded_downtime_seconds)],["Ongoing blocked tickets",d.active_downtime],["Missing downtime data",d.unrecorded_downtime]]}/><p className="hint">Issue start to first resolution for tickets marked as preventing work.</p></>}</MetricsPanel>;}

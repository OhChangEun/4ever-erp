export interface DashboardWorkflowRes {
  tabs: {
    tabCode: string;
    items: {
      itemId: string;
      itemTitle: string;
      itemNumber: string;
      name: string;
      statusCode: string;
      date: string;
    }[];
  }[];
}

export interface DashboardProps {
  workflowData?: DashboardWorkflowRes;
}

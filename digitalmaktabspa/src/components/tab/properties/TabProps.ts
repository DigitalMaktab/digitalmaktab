export interface TabItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabProps {
  tabs: TabItem[];
  defaultActiveTab?: string;
}

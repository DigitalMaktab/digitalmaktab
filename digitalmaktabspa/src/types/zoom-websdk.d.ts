declare module "@zoomus/websdk" {
  export const ZoomMtg: {
    setZoomJSLib: (path: string, dir: string) => void;
    preLoadWasm: () => void;
    prepareJssdk: () => void;
    generateSignature: (options: {
      meetingNumber: string;
      apiKey: string;
      apiSecret: string;
      role: number;
      success: (res: { result: string }) => void;
    }) => string;
    init: (options: {
      leaveUrl: string;
      isSupportAV: boolean;
      success: () => void;
      error?: (error: any) => void;
    }) => void;
    join: (options: {
      signature: string;
      meetingNumber: string;
      userName: string;
      apiKey: string;
      userEmail?: string;
      passWord?: string;
      success: (res: any) => void;
      error: (error: any) => void;
    }) => void;
  };
}

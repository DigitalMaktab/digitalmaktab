import React, { useEffect } from "react";
import { ZoomMtg } from "@zoomus/websdk";
import "@zoomus/websdk/dist/css/bootstrap.css";
import "@zoomus/websdk/dist/css/react-select.css";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";

ZoomMtg.setZoomJSLib("https://source.zoom.us/3.10.0/lib", "/av");
ZoomMtg.preLoadWasm();
ZoomMtg.prepareJssdk();

const AppOnlineClass: React.FC = () => {
  const { t } = useAppLocalizer();
  useEffect(() => {
    const startMeeting = async () => {
      const API_KEY = "vzN6JZSrQMqvgFoSNciCg";
      const API_SECRET = "e05LN99Xb5B5F2afSJnFiOqz0DAWv1Jx";
      const SECRECT_TOKEN = "uEEo3sxQQHClawCIiMumDQ";
      const VERIFICATION_TOKEN = "SGsik8_DRPmREwo9jIx-8w";
      const AUTHORIZATION_URL =
        "https://zoom.us/oauth/authorize?client_id=vzN6JZSrQMqvgFoSNciCg&response_type=code&redirect_uri=https%3A%2F%2Fdigitalmaktab.com%2Fredirect";
      const meetingNumber = "217 995 4008";
      const role = 1;
      const userName = t("appName");
      const userEmail = "dahee.naim@gmail.com";
      const passWord = "93UUnR";

      const signature = ZoomMtg.generateSignature({
        meetingNumber,
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        role,
        success: (res) => {
          console.log("Signature generated:", res.result);
        },
      });

      ZoomMtg.init({
        leaveUrl: "https://digitalmaktab.com",
        isSupportAV: true,
        success: () => {
          ZoomMtg.join({
            signature,
            meetingNumber,
            userName,
            apiKey: API_KEY,
            userEmail,
            passWord,
            success: (res) => {
              console.log("Join meeting success", res);
            },
            error: (err) => {
              console.error("Error joining meeting", err);
            },
          });
        },
        error: (err) => {
          console.error("Error initializing Zoom", err);
        },
      });
    };

    startMeeting();
  }, []);

  return <div id="zoom-meeting-container"></div>;
};

export default AppOnlineClass;

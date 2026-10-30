switch(drone){
  case init_send:
    // send all followers the square formation command
    sendCommandToFollower(0xFF, SQUARE_FORM);
    drone = leader;
    break;
  case leader:
    // send leader position to app
    transmitData(&txPacket, my_id, logGetFloat(idFlowX), logGetFloat(idFlowY), logGetFloat(idFlowZ));
    drone = follower_1;

    // send follower 1 drone command to send position to leader
    sendCommandToFollower(FOLLOWER_1_ID, SEND_DATA);
    break;
  case follower_1:
    if(dtrGetPacket(&receivedPacket, 10)){
      DEBUG_PRINT("Received packet from Follower 1 drone\n");
      if(receivedPacket.dataSize == 3*sizeof(float) && receivedPacket.sourceId == FOLLOWER_1_ID && receivedPacket.targetId == my_id){
        memcpy(&receivedX, &receivedPacket.data[0], sizeof(float));
        memcpy(&receivedY, &receivedPacket.data[4], sizeof(float));
        memcpy(&receivedZ, &receivedPacket.data[8], sizeof(float));

        transmitData(&txPacket, FOLLOWER_1_ID, receivedX, receivedY, receivedZ);
        DEBUG_PRINT("x: %f, y: %f, z: %f\n", (double)receivedX, (double)receivedY, (double)receivedZ);
        sendCommandToFollower(FOLLOWER_2_ID, SEND_DATA);
        drone = follower_2;
      }
    }
    break;

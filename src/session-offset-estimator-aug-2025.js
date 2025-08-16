
let reflectorJourneyEstimates;
let reportedOffsetEstimate = null;
let resetTrigger = null;
let pingsProcessed;
class SessionOffsetEstimator {
  // maintain a best guess of the minimum offset between the local wall clock and the reflector's raw time as received on PING messages and their PONG responses.  this is used purely to judge when an event has been held up on one or other leg, and hence to adjust the calculation of the estimated offset between local and reflector time.
  // one problem we have to deal with is network batching of messages, meaning that they often arrive late.  so whenever a reflector event indicates that its raw time is earlier than our current guess, we assume that this is closer to the actual timing.  immediately adjust our estimate.
  // but then, in case the minimum offset is in fact gradually growing - i.e., the local wall clock is gradually gaining on the reflector's - the estimate is continually nudged forwards using a bias that adds 0.2ms per second (12ms per minute) of elapsed time since the last adjustment.  we expect that bias to be overridden every few seconds by an accurately timed event - but if the actual offset really is drifting by a few ms per minute, the bias should ensure that we capture that.

  // we now also support "offline" mode, in which case the offsetEstimate
  // reports a fixed value (so reflector raw time appears to march exactly
  // in step with Date.now)
  constructor(sess, runOffline) {
    this.session = sess;
    this.runOffline = runOffline;
    if (!runOffline) {
      const controller = (this.controller = sess.view.realm.vm.controller);

      this.offsetEstimate = null;
      this.minRoundtrip = 0;

      controller.connection.pongHook = (args) => this.handlePong(args);
      this.initReflectorOffsets();
      this.sendPing();
    }
  }

  getOffsetEstimate() {
    return this.runOffline ? 1 : this.offsetEstimate;
  }

  sendPing() {
    if (!this.session) return;

    if (this.session.view) {
      // only actually send pings while there is a view
      const args = { sent: Math.floor(performance.now()) };
      this.controller.connection.PING(args);
    }

    // start with a ping every 150ms, until 30 have been processed.
    // then calm down to one every 300ms.
    const delayToNext = pingsProcessed < 30 ? 150 : 300;
    timerClient.setTimeout(() => this.sendPing(), delayToNext);
  }

  handlePong(args) {
    if (!this.session) return;

    const { sent, rawTime: reflectorRaw } = args;
    const now = Math.floor(performance.now());
    this.estimateReflectorOffset(sent, reflectorRaw, now);
    const { view } = this.session;
    if (view && view.sessionOffsetUpdated) view.sessionOffsetUpdated();
  }

  initReflectorOffsets() {
    reflectorJourneyEstimates = {
      outbound: { estimate: null, lastEstimateTime: 0 },
      inbound: { estimate: null, lastEstimateTime: 0 },
    };
    this.offsetEstimate = null;
    pingsProcessed = 0;
  }

  creepAndCorrectEstimate(direction, offset) {
    const record = reflectorJourneyEstimates[direction];
    const now = performance.now();
    const { estimate, lastEstimateTime } = record;
    const sinceLastEstimate = now - lastEstimateTime;
    let replace = estimate === null;
    if (!replace) {
      const bias = 0.0002; // 12ms/min
      const estimateWithBias = estimate + sinceLastEstimate * bias;
      // immediately act on any lower value.
      replace = offset < estimateWithBias;
    }
    if (replace) {
      // if (!record.estimate || (Math.abs(estimate - offset) > 0 && sinceLastEstimate > 5000)) console.log(`${direction} from ${estimate} to ${offset} after ${Math.round(sinceLastEstimate / 1000)}s`);
      record.estimate = offset;
      record.lastEstimateTime = now;
    }
    return replace;
  }

  estimateReflectorOffset(sent, reflectorRaw, now) {
    const outbound = reflectorRaw - sent;
    const inbound = now - reflectorRaw;
    const outboundReplaced = this.creepAndCorrectEstimate("outbound", outbound);
    const inboundReplaced = this.creepAndCorrectEstimate("inbound", inbound);

    // only recalculate when we have a fresh estimate for one or the other (or both)
    if (!outboundReplaced && !inboundReplaced) return;

    const excessOutbound = outboundReplaced
      ? 0
      : outbound - reflectorJourneyEstimates.outbound.estimate;
    const adjustedReflectorReceived = reflectorRaw - excessOutbound;

    const excessInbound = inboundReplaced
      ? 0
      : inbound - reflectorJourneyEstimates.inbound.estimate;
    const adjustedAudienceReceived = now - excessInbound;

    // sanity check on the calculation: if the theoretical minimum round trip implied by the actual round trip and the excess values is negative, time either here or on the reflector has jumped in a way that our algorithm isn't accounting for.  in that case, clear the outbound and inbound estimates and restart rapid polling to re-establish reasonable values.
    const impliedMinRoundTrip = now - sent - excessOutbound - excessInbound;
    if (impliedMinRoundTrip < -2) {
      // a millisecond or two can happen due to legitimate drift
      console.log("resetting reflector offset", {
        roundTrip: now - sent,
        excessOutbound,
        excessInbound,
        impliedMinRoundTrip,
      });
      resetTrigger = {
        roundTrip: now - sent,
        excessOutbound,
        excessInbound,
        impliedMinRoundTrip,
      }; // triggers sending of a report
      this.initReflectorOffsets();
      return;
    }

    const reflectorAhead = Math.round(
      (adjustedReflectorReceived + reflectorRaw) / 2 -
        (sent + adjustedAudienceReceived) / 2
    );

    const change =
      this.offsetEstimate === null
        ? 999
        : reflectorAhead - reportedOffsetEstimate;
    // don't report if it could be just a rounding error
    if (Math.abs(change) > 1) {
      console.log(`reflector ahead by ${reflectorAhead}ms`, {
        excessOutbound,
        excessInbound,
      });
      reportedOffsetEstimate = reflectorAhead;
    }

    this.offsetEstimate = reflectorAhead;
    pingsProcessed++;
    this.minRoundtrip = impliedMinRoundTrip;
  }

  fetchAndClearResetTrigger() {
    const trigger = resetTrigger;
    resetTrigger = null;
    return trigger;
  }

  shutDown() {
    this.session = null;
  }
}


// session setup
let session, sessionOffsetEstimator;
async function startSession() {
  // same args would be used to Session.join
  session = await StartWorldcore({
    appId,
    apiKey,
    name,
    password,
    options,
    autoSleep: false,
    flags: ["rawtime"],    // the "rawtime" is important
    debug: debugFlags,
    model: ModelRoot,
    view: ViewRoot,
  });

  sessionOffsetEstimator = new SessionOffsetEstimator(session, runOffline);
}

// session teardown
function shutDownSession() {
  session.leave();
  session = null;

  sessionOffsetEstimator.shutDown();
  sessionOffsetEstimator = null;
}


// session view-side access to offset estimator
class SomeView {
  constructor(model) {
    super(model);

    if (sessionOffsetEstimator) sessionOffsetEstimator.initReflectorOffsets();

    // other view init
  }

  announceSessionTime() {
    // the sessionOffsetEstimator provides an estimate of how far the reflector's
    // raw time is ahead of this client's performance.now().
    // from that, and the current values of performance.now and Date.now, we
    // calculate an estimate of what our Date.now would have been when the
    // reflector's raw time was zero.  that gets sent over the bridge.

    // if the Croquet session is running offline, the estimator
    // will return a constant offset of 1.
    const offset = sessionOffsetEstimator?.getOffsetEstimate();
    if (!offset) return;

    const perfNow = performance.now();
    const reflectorNow = sessionOffsetEstimator.offsetEstimate + perfNow;
    const dateNowAtReflectorZero = Date.now() - reflectorNow;

    // -------- and use that value however makes sense.  here's what happens in CforU
    this.sendCommand("croquetTime", String(Math.floor(dateNowAtReflectorZero)));
  }
}
import React from 'react';
import ReactDOM from 'react-dom';
import actionAll from '../router/helpers.js';
const animationEvents = 'webkitAnimationEnd oAnimationEnd animationEnd msAnimationEnd animationend'.split(' ');
const transitionEvents = 'webkitTransitionEnd oTransitionEnd transitionEnd msTransitionEnd transitionend'.split(' ');
let iOS, Safari, IE, desktop, mobile;

if (Meteor.isClient) {
  iOS = /iPad|iPhone|iPod/.test(navigator.platform);
  Safari = /Safari/.test(navigator.userAgent);
  IE = /MSIE /.test(navigator.userAgent);
  let reload = true;
  const resize = () => {
    let w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    let mobileWidth = 970;
    if (w < mobileWidth) {
      mobile = true;
      desktop = false;
      document.body.classList.add('mobile');
      document.body.classList.remove('desktop');
    }
    else {
      mobile = false;
      desktop = true;
      document.body.classList.remove('mobile');
      document.body.classList.add('desktop');
    }
  };
  // Resize on startup.
  Meteor.startup(resize);
  // Add a listener to keep track of the screen size.
  window.addEventListener('resize', resize);

  let windowDidPop = false;
  window.addEventListener('popstate', e => {
    if (!reload) {
      windowDidPop = true;
    }
    reload = false;
  });

  // Method to do animations/transitions on router exit event.
  const triggerExit = (context, redirect, stop) => {
    let bodyClasses = document.body.classList;
    let once = true;

    let views = document.getElementsByClassName('view');
    let viewNodeIn = views[0];
    let barNode = document.getElementsByClassName('bar')[0];
    let titleNodeIn = barNode.getElementsByClassName('title')[0];

    if (!IE && ((!windowDidPop && mobile) || desktop)) {
      if (viewNodeIn && !['swipe-end', 'swiping'].some(c => viewNodeIn.classList.contains(c))) {
        // Clone the view and place behind.
        let viewNodeOut = viewNodeIn.cloneNode(true);
        viewNodeOut.removeAttribute('data-reactid');
        viewNodeIn.parentNode.appendChild(viewNodeOut);
        // Clone the title and place it above.
        let titleNodeOut = titleNodeIn.cloneNode(true);
        titleNodeOut.removeAttribute('data-reactid');
        titleNodeOut.classList.add('out');
        titleNodeIn.parentNode.insertBefore(titleNodeOut, titleNodeIn);
        titleNodeIn.classList.add('in');

        animationEvents.forEach(eventName => viewNodeIn.addEventListener(eventName, (event) => {
          // Prevent multiple events firing when browsers support both prefixed and non-prefixed events.
          if (once) {
            once = false;
            viewNodeIn.classList.remove('pushright', 'fade', 'in');
            document.body.classList.remove('lock-transition');
            viewNodeOut.parentNode.removeChild(viewNodeOut);
            titleNodeIn.classList.remove('slide-fade', 'in');
            titleNodeOut.parentNode.removeChild(titleNodeOut);
          }
        }));
        // After new render.
        Meteor.setTimeout(() => {
          document.body.classList.add('lock-transition');
          if (mobile) {
            viewNodeIn.classList.add('pushright');
            viewNodeOut.classList.add('pushright');
            titleNodeIn.classList.add('slide-fade');
            titleNodeOut.classList.add('slide-fade');
          }
          if (desktop) {
            viewNodeIn.classList.add('fade');
            viewNodeOut.classList.add('fade');
          }
          viewNodeIn.classList.add('in');
          viewNodeOut.classList.add('out');
        }, 1);
      }
    }
    viewNodeIn.classList.remove('swipe-end');
    windowDidPop = false;
  };

  FlowRouter.triggers.exit([triggerExit]);
}

const StarWipe = class extends React.Component {
  constructor(props) {
    super(props);
    actionAll();
  }

  componentDidUpdate() {
    if (typeof ga == 'undefined') {
      var gaScript = 'https://www.google-analytics.com/analytics.js';
      DocHead.loadScript(gaScript, function() {
          // Google Analytics loaded
          ga('create', 'UA-65037403-2', 'auto');
          ga('send', 'pageview');
      });
    }
    else {
      ga('send', 'pageview');
    }

    if (iOS) {
      document.body.classList.add('ios');
    }
    if (Safari) {
      document.body.classList.add('safari');
    }
  }

  childOf(/*child node*/c, /*parent node*/p){ //returns boolean
    while((c=c.parentNode)&&c!==p);
    return !!c;
  }

  componentDidMount() {
    document.body.classList.add('ready');
    if (((!Safari && iOS) || !iOS) && mobile) {
      let node = ReactDOM.findDOMNode(this);
      let swipeReady = false;
      let swiping = false;
      let pageX;
      let deltaX;
      let viewNodeOut;
      let viewNodeIn;
      let titleNodeIn;
      let titleNodeOut;

      // Adding support for swiping back to the previous screen.
      node.addEventListener('touchstart', (event) => {
        let touch = event.touches[0];
        viewNodeOut = node.getElementsByClassName('view')[0];
        let barNode = document.getElementsByClassName('bar')[0];
        titleNodeIn = barNode.getElementsByClassName('title')[0];
        // On the touch start event we need to make sure we're not touching
        // anything that is outside the view, such as the header bar. To test
        // this we check if the event.target is contained within our view.
        if (viewNodeOut.contains(event.target)) {
          // We also need to check that the touched area is near the left edge
          // of the window screens available width.
          if (touch.clientX < 30) {
            // Not that we're in the right location of the screen, we have to
            // reset the variables tracking the change in horizontal position
            // and speed.
            pageX = touch.clientX;
            deltaX = 0;
            // Let's pass along a boolean saying we're ready to start swiping.
            swipeReady = true;
          }
        }
      });
      node.addEventListener('touchmove', (event) => {
        let touch = event.touches[0];
        let w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        // Calculate the horizontal movement change in percentage of the screen.
        let delta = ((touch.clientX - pageX) / w) * 100;

        // Initial test to validate starting the swipe effect.
        if (swipeReady && !swiping) {
          // We only want to validate a swipe movement once, therefor reset the
          // boolean.
          swipeReady = false;
          // Now that we're ready for swipe, we don't want to start the effect
          // before an actual sideways swipe has occured. Let's validate this by
          // checking the positional change.
          if (swiping = Math.round(delta) != 0) {
            // The idea is to place the view we're dragging in front of the view
            // that is being replaced and loading behind the scenes.
            viewNodeIn = viewNodeOut;
            viewNodeOut = viewNodeOut.cloneNode(true);
            // We need to put the covering view in front using css.
            viewNodeOut.classList.add('swiping');
            // Also let's place the new view with a -30% offset.
            viewNodeIn.style.marginLeft = "-30%";
            // For this to work we remove the reactid reference, and therefor
            // prevent React from altering this temporary node.
            viewNodeOut.removeAttribute('data-reactid');
            // It's important to do this before the node is inserted to the DOM,
            // as it would otherwise be conflicting with out existing view.
            viewNodeIn.parentNode.insertBefore(viewNodeOut, viewNodeIn);

            // Same thing for the title and place it above.
            titleNodeOut = titleNodeIn.cloneNode(true);
            titleNodeOut.removeAttribute('data-reactid');
            titleNodeOut.style.opacity = "1";
            titleNodeIn.style.opacity = "0";
            titleNodeIn.style.marginLeft = "-50%";
            titleNodeIn.parentNode.insertBefore(titleNodeOut, titleNodeIn);
            titleNodeIn.classList.add('swiping');

            // Great now that we have a view covering the scene, let's rerender.
            history.back();
          }
        }

        // Now for the logic around swiping and moving the front view.
        if (swiping) {
          // Stop any other occuring swiping effect.
          event.preventDefault();

          // Moving the front view in direct relation to the touch.
          viewNodeOut.style.marginLeft = (parseFloat(viewNodeOut.style.marginLeft || 0) + delta) + '%';
          // Moving the back screen with 30% of the speed of the front view.
          viewNodeIn.style.marginLeft = (parseFloat(viewNodeIn.style.marginLeft || 0) + delta * 0.3) + '%';

          // Moving the front view in direct relation to the touch.
          titleNodeOut.style.marginLeft = (parseFloat(titleNodeOut.style.marginLeft || 0) + delta * 0.7) + '%';
          // Moving the back screen with 30% of the speed of the front view.
          titleNodeIn.style.marginLeft = (parseFloat(titleNodeIn.style.marginLeft || 0) + delta * 0.50) + '%';
          // Moving the front view in direct relation to the touch.
          titleNodeOut.style.opacity = (parseFloat(titleNodeOut.style.opacity || 0) - delta / 100) + "";
          // Moving the back screen with 30% of the speed of the front view.
          titleNodeIn.style.opacity = (parseFloat(titleNodeIn.style.opacity || 0) + delta / 100) + "";

          // Update the variables tracking the change in horizontal position
          // and speed.
          pageX = touch.clientX;
          deltaX = (deltaX + delta) / 2;
        }
      });
      node.addEventListener('touchend', (event) => {
        let w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        let once = true;
        let revert = false;
        if (swiping) {
          document.body.classList.add('lock-transition');
          // Now that the effect is ending, reset the booleans keeping it going.
          swiping = false;

          // Get the current position the view in percent.
          let value = parseFloat(viewNodeOut.style.marginLeft);

          // We let CSS transition the views to the ending position.
          viewNodeOut.classList.add('swipe-end');
          viewNodeIn.classList.add('swipe-end');
          titleNodeOut.classList.add('swipe-end');
          titleNodeIn.classList.add('swipe-end');

          // To know if the should fulfill or revert the transition, the screen
          // could either be more than half across the screen or have gained
          // enough momentum in the swipe movement.
          if (value > 50 || value > 0 && deltaX > 1.5) {
            // And also calculate the speed of movement we need to follow along
            // the swipe speed across the screen.
            let transitionDuration = Math.max(150, Math.min(500,
              4 * Math.round((w * (1 - Math.abs(value/100))) / Math.abs(deltaX))));

            // And we alter the duration of the CSS transition to feel like the
            // transition followed the swipe movement speed.
            viewNodeOut.style.transitionDuration = transitionDuration + 'ms';
            viewNodeIn.style.transitionDuration = transitionDuration + 'ms';
            titleNodeOut.style.transitionDuration = transitionDuration + 'ms';
            titleNodeIn.style.transitionDuration = transitionDuration + 'ms';

            viewNodeOut.style.marginLeft = "100%";
            viewNodeIn.style.marginLeft = "";
            titleNodeOut.style.marginLeft = "70%";
            titleNodeIn.style.marginLeft = "";
            titleNodeOut.style.opacity = "0";
            titleNodeIn.style.opacity = "1";
          }
          else {
            revert = true;
            // Revert the position of the views.
            viewNodeOut.style.marginLeft = "";
            viewNodeIn.style.marginLeft = "-30%";
            // Revert the position of the titles.
            titleNodeOut.style.marginLeft = "";
            titleNodeIn.style.marginLeft = "-30%";
            titleNodeOut.style.opacity = "1";
            titleNodeIn.style.opacity = "0";
          }
          // Now it's down to waiting for the transition to end, before we do
          // anything else like reverting the history or removing nodes.
          transitionEvents.forEach(eventName => viewNodeOut.addEventListener(eventName, () => {
            // Prevent multiple events firing when browsers support both prefixed and non-prefixed events.
            if (once) {
              document.body.classList.remove('lock-transition');
              once = false;
              // Remove any alterations we've done to the view.
              viewNodeIn.style.transitionDuration = "";
              titleNodeIn.style.transitionDuration = "";

              viewNodeIn.classList.remove('swipe-end');
              titleNodeIn.classList.remove('swipe-end', 'swiping');

              if (revert) {
                viewNodeIn.style.marginLeft = "";

                history.forward();
                setTimeout(() => {
                  viewNodeIn.classList.remove('swiping');
                  viewNodeOut.parentNode.removeChild(viewNodeOut);
                  titleNodeOut.parentNode.removeChild(titleNodeOut);
                  titleNodeIn.style.marginLeft = "";
                  titleNodeIn.style.opacity = "";
                }, 1);
              }
              else {
                viewNodeOut.parentNode.removeChild(viewNodeOut);
                titleNodeOut.parentNode.removeChild(titleNodeOut);
                titleNodeIn.style.marginLeft = "";
                titleNodeIn.style.opacity = "";
              }
            }
          }));
        }
      });
    }
  }

  render() {
    let {title, content} = this.props;
    return (
      <div className="ionic-body">
        <div className="bar bar-header">
          <a href="/settings" className="button button-icon icon ion-gear-a"></a>
          <a className="h1 title">{title}</a>
          <a href="/other" className="button button-icon icon ion-heart"></a>
        </div>
        <div className={["view active", title.toLowerCase()].join(' ')}>
          <div className="scroll-content ionic-scroll">
            <div className="content overflow-scroll has-header">
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default StarWipe;

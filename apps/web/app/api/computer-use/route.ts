import { NextResponse } from 'next/server';
import { executeComputerUseAction, type ComputerUseAction } from '../../lib/computer-use-actions';
import { getAllHosts, selectHostForMinion } from '../../lib/remote-ssh-provider';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const minionId = searchParams.get('minionId');
  const actionParam = searchParams.get('action');

  let host;
  if (minionId) {
    host = selectHostForMinion(minionId);
  } else {
    const hosts = getAllHosts();
    host = hosts[0];
  }

  if (!host) {
    return NextResponse.json({ error: 'No SSH host configured. Set MINIONMINT_SSH_HOST and MINIONMINT_SSH_USERNAME.' }, { status: 400 });
  }

  try {
    const body = await request.json();

    let action: ComputerUseAction;
    if (actionParam) {
      switch (actionParam) {
        case 'screenshot':
          action = { type: 'screenshot' };
          break;
        case 'click':
          action = { type: 'click', params: body };
          break;
        case 'drag':
          action = { type: 'drag', params: body };
          break;
        case 'type':
          action = { type: 'type', params: body };
          break;
        case 'key':
          action = { type: 'key', params: body };
          break;
        case 'scroll':
          action = { type: 'scroll', params: body };
          break;
        case 'wait':
          action = { type: 'wait', params: body };
          break;
        case 'bash':
          action = { type: 'bash', command: body.command };
          break;
        case 'exec':
          action = { type: 'exec', code: body.code, timeout: body.timeout };
          break;
        default:
          return NextResponse.json({ error: `Unknown action: ${actionParam}` }, { status: 400 });
      }
    } else {
      action = body as ComputerUseAction;
    }

    const result = await executeComputerUseAction(host, action);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ error: `Invalid request: ${err}` }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const minionId = searchParams.get('minionId');

  let host;
  if (minionId) {
    host = selectHostForMinion(minionId);
  } else {
    const hosts = getAllHosts();
    host = hosts[0];
  }

  if (!host) {
    return NextResponse.json({ error: 'No SSH host configured.' }, { status: 400 });
  }

  if (action === 'screenshot') {
    const result = await executeComputerUseAction(host, { type: 'screenshot' });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  }

  return NextResponse.json({ error: 'Use POST with an action type, or GET with ?action=screenshot' }, { status: 400 });
}

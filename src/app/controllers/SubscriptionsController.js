import { Op } from 'sequelize';

import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';
import File from '../models/File';

import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';

class SubscriptionsController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      attributes: {
        exclude: ['meetup_id'],
      },
      include: {
        model: Meetup,
        required: true,
        where: {
          date: {
            [Op.gte]: new Date(),
          },
        },
        attributes: {
          exclude: ['user_id', 'image_id'],
        },
        include: [
          {
            model: User,
            attributes: ['name', 'email'],
          },
          {
            model: File,
            attributes: ['path', 'url'],
          },
        ],
      },
      order: [[Meetup, 'date']],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.meetupId, {
      include: [User],
    });

    if (meetup.user_id === user.id) {
      return res
        .status(400)
        .json({ error: 'Can not subscribe to your own meetups' });
    }

    if (meetup.past) {
      return res
        .status(400)
        .json({ error: 'Can not subscribe to past meetups' });
    }

    /**
     * User can not subscribe for the same meetup twice
     * or into two meetups at the same time
     */
    const checkDate = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: {
        model: Meetup,
        required: true,
        where: {
          date: meetup.date,
        },
      },
    });

    if (checkDate) {
      return res
        .status(400)
        .json({ error: 'Can not subscribe to two meetups at the same time' });
    }

    const subscription = await Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    await Queue.add(SubscriptionMail.key, {
      meetup,
      user,
    });

    return res.json(subscription);
  }

  async delete(req, res) {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: Meetup,
    });

    if (subscription.Meetup.past) {
      return res
        .status(400)
        .json({ error: `Can't unsubscribe to past meetups` });
    }

    if (req.userId !== subscription.user_id) {
      return res.status(401).json({
        error: `You can't unsubscribe from meetups you haven't subscribed to`,
      });
    }

    await subscription.destroy();

    return res.json();
  }
}

export default new SubscriptionsController();

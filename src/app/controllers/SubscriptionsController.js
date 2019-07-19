import { Op } from 'sequelize';

import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';

class SubscriptionsController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      include: {
        model: Meetup,
        as: 'meetup',
        required: true,
        where: {
          date: {
            [Op.gte]: new Date(),
          },
        },
      },
      order: [[Meetup, 'date']],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.meetupId, {
      attributes: {
        exclude: ['user_id'],
      },
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    });

    if (meetup.user.id === user.id) {
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
        as: 'meetup',
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

    const subscription = Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    return res.json(subscription);
  }
}

export default new SubscriptionsController();
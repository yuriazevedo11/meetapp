import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';

import Subscription from '../models/Subscription';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class MeetupController {
  async index(req, res) {
    const { page = 1, date } = req.query;
    const parsedDate = parseISO(date);

    if (!isValid(parsedDate)) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const meetups = await Meetup.findAll({
      where: {
        user_id: {
          [Op.not]: req.userId,
        },
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
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
      limit: 10,
      offset: (page - 1) * 10,
      order: ['date'],
    });

    /**
     * Return all meetups that are not subscribed by user
     */

    const subscriptionMeetupIds = (await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
    })).map(subscription => subscription.meetup_id);

    const meetupsNotSubscribed = meetups.filter(
      meetup => !subscriptionMeetupIds.includes(meetup.id)
    );

    return res.json(meetupsNotSubscribed);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      image_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error' });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const user_id = req.userId;

    const meetup = await Meetup.create({
      ...req.body,
      user_id,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
      image_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error' });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.past) {
      return res.status(400).json({ error: 'Can not update past meetups' });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    if (req.userId !== meetup.user_id) {
      return res.status(401).json({ error: 'User is not the organizer' });
    }

    await meetup.update(req.body);

    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.past) {
      return res.status(400).json({ error: `Can't delete past meetups` });
    }

    if (req.userId !== meetup.user_id) {
      return res.status(401).json({ error: 'User is not the organizer' });
    }

    await meetup.destroy();

    return res.json();
  }
}

export default new MeetupController();
